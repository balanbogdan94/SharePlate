using System.Text.Json;
using System.Text.Json.Nodes;
using SharePlate.Core.Entities;
using SharePlate.Core.ValueObjects;
using Xunit;

namespace SharePlate.Tests;

public class RecipeNotesTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void Legacy_notes_remain_exact_and_clear_formatting(string? document)
    {
        const string plain = "  Legacy <text>\r\n\nhttps://example.com  ";
        var recipe = Recipe.Create("Soup", "ignored", Guid.NewGuid(), notesDocument: NotesDocuments.Empty);
        recipe.UpdateNotes(plain, document);
        Assert.Equal(plain, recipe.Notes);
        Assert.Null(recipe.NotesDocument);
        Assert.Equal(plain, Recipe.Create("Soup", plain, Guid.NewGuid()).Notes);
    }

    [Fact]
    public void Empty_paragraph_is_a_valid_authoritative_document()
    {
        var notes = RecipeNotes.Create("discard this", NotesDocuments.Empty);
        Assert.Equal("", notes.Text);
        Assert.NotNull(notes.Document);
    }

    [Fact]
    public void Projects_paragraphs_hard_breaks_and_mixed_lists_at_three_levels()
    {
        const string document = """
            {"version":1,"content":{"type":"doc","content":[
              {"type":"paragraph","content":[{"type":"text","text":"Prep"},{"type":"hardBreak"},{"type":"text","text":"first"}]},
              {"type":"paragraph","content":[{"type":"text","text":"Next"}]},
              {"type":"orderedList","attrs":{"start":2},"content":[
                {"type":"listItem","content":[
                  {"type":"paragraph","content":[{"type":"text","text":"Mix"}]},
                  {"type":"paragraph","content":[{"type":"text","text":"More"},{"type":"hardBreak"},{"type":"text","text":"carefully"}]},
                  {"type":"bulletList","content":[{"type":"listItem","content":[
                    {"type":"paragraph","content":[{"type":"text","text":"Stir"}]},
                    {"type":"orderedList","attrs":{"start":4},"content":[{"type":"listItem","content":[
                      {"type":"paragraph","content":[{"type":"text","text":"Wait"}]}
                    ]}]}
                  ]}]}
                ]},
                {"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Bake"}]}]}
              ]},
              {"type":"paragraph","content":[{"type":"text","text":"Done"}]}
            ]}}
            """;
        var notes = RecipeNotes.Create("ignored", document);
        Assert.Equal("Prep\nfirst\n\nNext\n\n2. Mix\n\n  More\n  carefully\n  - Stir\n    4. Wait\n3. Bake\n\nDone", notes.Text);
    }

    [Fact]
    public void Links_are_url_visible_in_projection_once_and_normalized_to_href_only()
    {
        const string url = "https://example.com/recipe?q=soup&portion=2#steps";
        var document = NotesDocuments.Link(url, url);
        var attrs = JsonNode.Parse(document)!["content"]!["content"]![0]!["content"]![0]!["marks"]![0]!["attrs"]!;
        attrs["target"] = "_blank";
        attrs["rel"] = "noopener noreferrer";
        attrs["class"] = null;
        var notes = RecipeNotes.Create("", attrs.Root.ToJsonString());
        Assert.Equal(url, notes.Text);
        using var stored = JsonDocument.Parse(notes.Document!);
        var storedAttrs = stored.RootElement.GetProperty("content").GetProperty("content")[0]
            .GetProperty("content")[0].GetProperty("marks")[0].GetProperty("attrs");
        Assert.Single(storedAttrs.EnumerateObject());
        Assert.Equal(url, storedAttrs.GetProperty("href").GetString());
    }

    [Theory]
    [InlineData("http://example.com")]
    [InlineData("https://example.com/a?x=1&y=2")]
    public void Accepts_absolute_http_and_https_urls(string url)
        => Assert.Equal(url, RecipeNotes.Create("", NotesDocuments.Link(url, url)).Text);

    [Theory]
    [InlineData("javascript:alert(1)")]
    [InlineData("data:text/html,hi")]
    [InlineData("file:///etc/passwd")]
    [InlineData("//example.com")]
    [InlineData("/recipe")]
    [InlineData("https://good.example@evil.example")]
    [InlineData("https://example.com\\@evil.example")]
    [InlineData(" https://example.com")]
    [InlineData("https://example.com\n")]
    [InlineData("https://example.com/a b")]
    [InlineData("https://")]
    public void Rejects_unsafe_or_relative_links(string url)
        => Assert.Throws<RecipeNotesValidationException>(() => RecipeNotes.Create("", NotesDocuments.Link(url, url)));

    [Theory]
    [InlineData("click here", "https://example.com")]
    [InlineData("https://safe.example", "https://evil.example")]
    public void Rejects_hidden_or_mismatched_link_destinations(string text, string href)
        => Assert.Throws<RecipeNotesValidationException>(() => RecipeNotes.Create("", NotesDocuments.Link(text, href)));

    [Theory]
    [MemberData(nameof(InvalidDocuments))]
    public void Rejects_invalid_json_envelope_schema_and_depth(string document)
        => Assert.Throws<RecipeNotesValidationException>(() => RecipeNotes.Create("no fallback", document));

    public static IEnumerable<object[]> InvalidDocuments()
    {
        string[] invalid =
        [
            " ", "{", "null", "[]", "{}", """{"version":2,"content":{"type":"doc","content":[]}}""",
            """{"version":"1","content":{"type":"doc","content":[]}}""",
            """{"version":1,"version":1,"content":{"type":"doc","content":[]}}""",
            """{"version":1,"extra":true,"content":{"type":"doc","content":[]}}""",
            """{"version":1,"\uD800":true,"content":{"type":"doc","content":[{"type":"paragraph"}]}}""",
            """{"version":1}""", """{"content":{"type":"doc"}}""",
            NotesDocuments.Wrap("""{"type":"doc","content":[]}"""),
            NotesDocuments.Wrap("""{"type":"doc","content":null}"""),
            NotesDocuments.Wrap("""{"type":"doc","content":[null]}"""),
            NotesDocuments.Wrap("""{"type":"doc","content":[{"type":"text","text":"not a block"}]}"""),
            NotesDocuments.Wrap("""{"type":"doc","content":[{"type":"paragraph","attrs":{"align":"left"}}]}"""),
            NotesDocuments.Paragraph("""{"type":"text","text":""}"""),
            NotesDocuments.Paragraph("""{"type":"text"}"""),
            NotesDocuments.Paragraph("""{"type":"text","text":3}"""),
            NotesDocuments.Paragraph("""{"type":"text","text":"\uD800"}"""),
            NotesDocuments.Paragraph("""{"type":"text","text":"\uDC00"}"""),
            NotesDocuments.Paragraph("""{"type":"text","text":"a","text":"b"}"""),
            NotesDocuments.Paragraph("""{"type":"text","text":"a","marks":null}"""),
            NotesDocuments.Paragraph("""{"type":"text","text":"a","marks":[{"type":"bold"}]}"""),
            NotesDocuments.Paragraph("""{"type":"text","text":"a","marks":[{"type":"link"},{"type":"link"}]}"""),
            NotesDocuments.Paragraph("""{"type":"hardBreak","attrs":{}}"""),
            NotesDocuments.Paragraph("""{"type":"image","attrs":{"src":"https://example.com"}}"""),
            NotesDocuments.Paragraph("""{"type":"bulletList","content":[]}"""),
            NotesDocuments.Wrap("""{"type":"doc","content":[{"type":"bulletList","content":[]}]}"""),
            NotesDocuments.Wrap("""{"type":"doc","content":[{"type":"bulletList","content":[{"type":"paragraph"}]}]}"""),
            NotesDocuments.Wrap("""{"type":"doc","content":[{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph"}]}]}]}]}]}"""),
            NotesDocuments.Wrap("""{"type":"doc","content":[{"type":"orderedList","attrs":{"start":0},"content":[{"type":"listItem","content":[{"type":"paragraph"}]}]}]}"""),
            NotesDocuments.Wrap("""{"type":"doc","content":[{"type":"orderedList","attrs":{"start":1.5},"content":[{"type":"listItem","content":[{"type":"paragraph"}]}]}]}"""),
            NotesDocuments.Wrap("""{"type":"doc","content":[{"type":"orderedList","attrs":{"start":2147483648},"content":[{"type":"listItem","content":[{"type":"paragraph"}]}]}]}"""),
            NotesDocuments.Wrap("""{"type":"doc","content":[{"type":"orderedList","attrs":{"start":1,"other":true},"content":[{"type":"listItem","content":[{"type":"paragraph"}]}]}]}"""),
            NotesDocuments.NestedList(4),
            new string('[', 40) + "0" + new string(']', 40)
        ];
        return invalid.Select(value => new object[] { value });
    }

    [Theory]
    [InlineData("target", "42")]
    [InlineData("rel", """{"unexpected":true}""")]
    [InlineData("class", "\"<script>\"")]
    [InlineData("unknown", "\"anything\"")]
    public void Rejects_unsafe_or_unknown_link_attributes(string name, string value)
    {
        var document = JsonNode.Parse(NotesDocuments.Link("https://example.com", "https://example.com"))!;
        document["content"]!["content"]![0]!["content"]![0]!["marks"]![0]!["attrs"]![name] = JsonNode.Parse(value);
        Assert.Throws<RecipeNotesValidationException>(() => RecipeNotes.Create("", document.ToJsonString()));
    }

    [Fact]
    public void Bounds_document_bytes_and_node_count_without_low_text_limit()
    {
        var substantial = new string('x', 500_000);
        Assert.Equal(substantial, RecipeNotes.Create("", NotesDocuments.Text(substantial)).Text);
        Assert.Throws<RecipeNotesValidationException>(() => RecipeNotes.Create("", NotesDocuments.Text(new string('x', RecipeNotes.MaxDocumentBytes))));
        Assert.Throws<RecipeNotesValidationException>(() => RecipeNotes.Create("", NotesDocuments.Text(new string('é', 600_000))));
        var manyNodes = NotesDocuments.Wrap("""{"type":"doc","content":[""" +
            string.Join(",", Enumerable.Repeat("""{"type":"paragraph"}""", RecipeNotes.MaxNodes)) + "]}");
        Assert.True(manyNodes.Length < RecipeNotes.MaxDocumentBytes);
        Assert.Throws<RecipeNotesValidationException>(() => RecipeNotes.Create("", manyNodes));
    }

    [Fact]
    public void Invalid_domain_updates_leave_both_representations_unchanged()
    {
        var recipe = Recipe.Create("Soup", "", Guid.NewGuid(), notesDocument: NotesDocuments.Text("before"));
        var stored = recipe.NotesDocument;
        var updatedAt = recipe.UpdatedAt;
        Assert.Throws<RecipeNotesValidationException>(() => recipe.UpdateNotes("overwrite", "{"));
        Assert.Equal("before", recipe.Notes);
        Assert.Equal(stored, recipe.NotesDocument);
        Assert.Equal(updatedAt, recipe.UpdatedAt);
        recipe.UpdateNotes("ignored", NotesDocuments.Text("after"));
        Assert.Equal("after", recipe.Notes);
        Assert.Contains("after", recipe.NotesDocument!);
    }
}

internal static class NotesDocuments
{
    public const string Empty = """{"version":1,"content":{"type":"doc","content":[{"type":"paragraph"}]}}""";
    public static string Wrap(string doc) => """{"version":1,"content":""" + doc + "}";
    public static string Paragraph(string inline) => Wrap("""{"type":"doc","content":[{"type":"paragraph","content":[""" + inline + "]}]}");
    public static string Text(string text) => Paragraph(JsonSerializer.Serialize(new { type = "text", text }));
    public static string Link(string text, string href) =>
        Paragraph(JsonSerializer.Serialize(new { type = "text", text, marks = new[] { new { type = "link", attrs = new { href } } } }));
    public static string NestedList(int levels)
    {
        var child = """{"type":"paragraph","content":[{"type":"text","text":"step"}]}""";
        for (var i = 0; i < levels; i++)
            child = """{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph"},""" + child + "]}]}";
        return Wrap("""{"type":"doc","content":[""" + child + "]}");
    }
}
