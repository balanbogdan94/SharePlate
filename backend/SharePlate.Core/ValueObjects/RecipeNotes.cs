using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace SharePlate.Core.ValueObjects;

public sealed class RecipeNotes
{
    public const int MaxDocumentBytes = 1024 * 1024;
    public const int MaxNodes = 25_000;
    public const int MaxJsonDepth = 32;
    public const int MaxListDepth = 3;

    private RecipeNotes(string text, string? document)
    {
        Text = text;
        Document = document;
    }

    public string Text { get; }
    public string? Document { get; }

    public static RecipeNotes Create(string notes, string? document = null)
    {
        if (string.IsNullOrEmpty(document))
            return new RecipeNotes(notes, null);

        if (document.Length > MaxDocumentBytes || Encoding.UTF8.GetByteCount(document) > MaxDocumentBytes)
            throw Invalid("NotesDocument must not exceed 1 MiB of UTF-8 JSON.");

        try
        {
            using var parsed = JsonDocument.Parse(document, new JsonDocumentOptions { MaxDepth = MaxJsonDepth });
            var envelope = parsed.RootElement;
            CheckProperties(envelope, "version", "content");
            var version = Required(envelope, "version");
            if (version.ValueKind != JsonValueKind.Number || !version.TryGetInt32(out var number) || number != 1)
                throw Invalid("NotesDocument version must be 1.");

            var count = 0;
            var content = NormalizeNode(Required(envelope, "content"), ["doc"], 0, ref count);
            var normalized = new JsonObject { ["version"] = 1, ["content"] = content };
            var text = string.Join("\n\n", Children(content).Select(block =>
                Type(block!) == "paragraph" ? ParagraphText(block!) : RenderList(block!, 0)));
            return new RecipeNotes(text, normalized.ToJsonString());
        }
        catch (JsonException)
        {
            throw Invalid($"NotesDocument must be valid JSON with a maximum JSON depth of {MaxJsonDepth}.");
        }
        catch (InvalidOperationException)
        {
            // JsonDocument defers validation of escaped UTF-16 until strings/properties are read.
            throw Invalid("NotesDocument contains invalid Unicode text.");
        }
    }

    private static JsonObject NormalizeNode(JsonElement node, string[] allowedTypes, int listDepth, ref int count)
    {
        if (++count > MaxNodes)
            throw Invalid($"NotesDocument must not exceed {MaxNodes} nodes.");

        if (node.ValueKind != JsonValueKind.Object)
            throw Invalid("Document nodes must be objects.");
        var type = RequiredString(node, "type");
        if (!allowedTypes.Contains(type))
            throw Invalid($"Node '{type}' is not allowed here.");

        var result = new JsonObject { ["type"] = type };
        switch (type)
        {
            case "text":
                CheckProperties(node, "type", "text", "marks");
                var text = RequiredString(node, "text");
                if (text.Length == 0)
                    throw Invalid("Text nodes must contain nonempty text.");
                result["text"] = text;
                if (node.TryGetProperty("marks", out var marks))
                {
                    if (marks.ValueKind != JsonValueKind.Array || marks.GetArrayLength() > 1)
                        throw Invalid("Text marks may contain only one link.");
                    if (marks.GetArrayLength() == 1)
                        result["marks"] = new JsonArray(NormalizeLink(marks[0], text));
                }
                return result;
            case "hardBreak":
                CheckProperties(node, "type");
                return result;
            case "orderedList":
                CheckProperties(node, "type", "content", "attrs");
                if (node.TryGetProperty("attrs", out var attrs))
                {
                    CheckProperties(attrs, "start");
                    if (attrs.TryGetProperty("start", out var start))
                    {
                        if (start.ValueKind != JsonValueKind.Number || !start.TryGetInt32(out var value) || value <= 0)
                            throw Invalid("Ordered list start must be a positive integer.");
                        result["attrs"] = new JsonObject { ["start"] = value };
                    }
                }
                break;
            default:
                CheckProperties(node, "type", "content");
                break;
        }

        var isList = type is "bulletList" or "orderedList";
        if (isList && ++listDepth > MaxListDepth)
            throw Invalid($"Lists must not exceed {MaxListDepth} total nesting levels.");

        var children = new JsonArray();
        if (node.TryGetProperty("content", out var childElements))
        {
            if (childElements.ValueKind != JsonValueKind.Array)
                throw Invalid("Node content must be an array.");
            string[] allowedChildren = type switch
            {
                "paragraph" => ["text", "hardBreak"],
                "bulletList" or "orderedList" => ["listItem"],
                _ => ["paragraph", "bulletList", "orderedList"]
            };
            foreach (var child in childElements.EnumerateArray())
                children.Add(NormalizeNode(child, allowedChildren, listDepth, ref count));
        }
        if (type != "paragraph" && children.Count == 0)
            throw Invalid($"Node '{type}' must contain at least one child.");
        if (type == "listItem" && Type(children[0]!) != "paragraph")
            throw Invalid("List item content must start with a paragraph.");
        if (children.Count > 0 || type != "paragraph")
            result["content"] = children;
        return result;
    }

    private static JsonObject NormalizeLink(JsonElement mark, string text)
    {
        CheckProperties(mark, "type", "attrs");
        if (RequiredString(mark, "type") != "link")
            throw Invalid("Only link marks are supported.");
        var attrs = Required(mark, "attrs");
        CheckProperties(attrs, "href", "target", "rel", "class");
        var href = RequiredString(attrs, "href");
        if ((!href.StartsWith("http://", StringComparison.OrdinalIgnoreCase) &&
             !href.StartsWith("https://", StringComparison.OrdinalIgnoreCase)) ||
            href.Any(c => char.IsWhiteSpace(c) || char.IsControl(c) || c is '\\' or '<' or '>') ||
            !Uri.TryCreate(href, UriKind.Absolute, out var uri) ||
            (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps) ||
            string.IsNullOrEmpty(uri.Host) || !string.IsNullOrEmpty(uri.UserInfo))
            throw Invalid("Links must use absolute HTTP(S) URLs without credentials, whitespace, or control characters.");
        if (!string.Equals(text, href, StringComparison.Ordinal))
            throw Invalid("Link text must equal its href so that the destination URL is visible.");
        foreach (var property in attrs.EnumerateObject().Where(p => p.Name != "href"))
        {
            if (property.Value.ValueKind == JsonValueKind.Null)
                continue;
            if (property.Value.ValueKind != JsonValueKind.String ||
                property.Value.GetString()!.Any(c => char.IsControl(c) || c is '<' or '>'))
                throw Invalid("Link target, rel, and class must be innocuous strings or null.");
        }
        return new JsonObject
        {
            ["type"] = "link",
            ["attrs"] = new JsonObject { ["href"] = href }
        };
    }

    private static string RenderList(JsonNode list, int depth)
    {
        var items = new List<string>();
        long number = list["attrs"]?["start"]?.GetValue<int>() ?? 1;
        foreach (var item in Children(list))
        {
            var marker = Type(list) == "orderedList" ? $"{number++}. " : "- ";
            var indent = new string(' ', depth * 2);
            var continuation = new string(' ', indent.Length + 2);
            var blocks = Children(item!);
            var rendered = new StringBuilder(indent + marker);
            rendered.Append(ParagraphText(blocks[0]!).Replace("\n", "\n" + continuation));
            foreach (var block in blocks.Skip(1))
            {
                if (Type(block!) == "paragraph")
                    rendered.Append("\n\n").Append(continuation)
                        .Append(ParagraphText(block!).Replace("\n", "\n" + continuation));
                else
                    rendered.Append('\n').Append(RenderList(block!, depth + 1));
            }
            items.Add(rendered.ToString());
        }
        return string.Join("\n", items);
    }

    private static string ParagraphText(JsonNode paragraph) =>
        string.Concat(Children(paragraph).Select(node => Type(node!) == "hardBreak" ? "\n" : node!["text"]!.GetValue<string>()));

    private static JsonArray Children(JsonNode node) => node["content"]?.AsArray() ?? [];
    private static string Type(JsonNode node) => node["type"]!.GetValue<string>();

    private static JsonElement Required(JsonElement element, string name) =>
        element.TryGetProperty(name, out var value) ? value : throw Invalid($"Missing required property '{name}'.");

    private static string RequiredString(JsonElement element, string name)
    {
        var value = Required(element, name);
        return value.ValueKind == JsonValueKind.String
            ? value.GetString()!
            : throw Invalid($"Property '{name}' must be a string.");
    }

    private static void CheckProperties(JsonElement element, params string[] allowed)
    {
        if (element.ValueKind != JsonValueKind.Object)
            throw Invalid("Document objects must be JSON objects.");
        var seen = new HashSet<string>(StringComparer.Ordinal);
        foreach (var property in element.EnumerateObject())
        {
            if (!allowed.Contains(property.Name) || !seen.Add(property.Name))
                throw Invalid($"Unknown or duplicate property '{property.Name}'.");
        }
    }

    private static RecipeNotesValidationException Invalid(string message) => new(message);
}

public sealed class RecipeNotesValidationException(string message) : ArgumentException(message);
