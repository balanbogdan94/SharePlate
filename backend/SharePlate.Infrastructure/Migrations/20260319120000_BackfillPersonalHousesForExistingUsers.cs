using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SharePlate.Infrastructure.Data;

#nullable disable

namespace SharePlate.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260319120000_BackfillPersonalHousesForExistingUsers")]
    public partial class BackfillPersonalHousesForExistingUsers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                WITH users_without_house AS (
                    SELECT
                        u."Id" AS user_id,
                        u."Name" AS user_name,
                        (
                            substr(md5(u."Id"::text || ':personal-house'), 1, 8) || '-' ||
                            substr(md5(u."Id"::text || ':personal-house'), 9, 4) || '-' ||
                            substr(md5(u."Id"::text || ':personal-house'), 13, 4) || '-' ||
                            substr(md5(u."Id"::text || ':personal-house'), 17, 4) || '-' ||
                            substr(md5(u."Id"::text || ':personal-house'), 21, 12)
                        )::uuid AS house_id,
                        (
                            substr(md5(u."Id"::text || ':personal-house-member'), 1, 8) || '-' ||
                            substr(md5(u."Id"::text || ':personal-house-member'), 9, 4) || '-' ||
                            substr(md5(u."Id"::text || ':personal-house-member'), 13, 4) || '-' ||
                            substr(md5(u."Id"::text || ':personal-house-member'), 17, 4) || '-' ||
                            substr(md5(u."Id"::text || ':personal-house-member'), 21, 12)
                        )::uuid AS house_member_id
                    FROM "Users" u
                    LEFT JOIN "HouseMembers" hm ON hm."UserId" = u."Id"
                    WHERE hm."Id" IS NULL
                )
                INSERT INTO "Houses" ("Id", "Name", "Code", "IsPersonal", "OwnerId", "CreatedAt", "UpdatedAt")
                SELECT
                    uwh.house_id,
                    uwh.user_name || '''s House',
                    upper(substr(md5(uwh.user_id::text || ':personal-house-code'), 1, 4)) || '-' ||
                    upper(substr(md5(uwh.user_id::text || ':personal-house-code'), 5, 4)),
                    TRUE,
                    uwh.user_id,
                    NOW(),
                    NOW()
                FROM users_without_house uwh;
                """);

            migrationBuilder.Sql(
                """
                WITH users_without_house AS (
                    SELECT
                        u."Id" AS user_id,
                        (
                            substr(md5(u."Id"::text || ':personal-house'), 1, 8) || '-' ||
                            substr(md5(u."Id"::text || ':personal-house'), 9, 4) || '-' ||
                            substr(md5(u."Id"::text || ':personal-house'), 13, 4) || '-' ||
                            substr(md5(u."Id"::text || ':personal-house'), 17, 4) || '-' ||
                            substr(md5(u."Id"::text || ':personal-house'), 21, 12)
                        )::uuid AS house_id,
                        (
                            substr(md5(u."Id"::text || ':personal-house-member'), 1, 8) || '-' ||
                            substr(md5(u."Id"::text || ':personal-house-member'), 9, 4) || '-' ||
                            substr(md5(u."Id"::text || ':personal-house-member'), 13, 4) || '-' ||
                            substr(md5(u."Id"::text || ':personal-house-member'), 17, 4) || '-' ||
                            substr(md5(u."Id"::text || ':personal-house-member'), 21, 12)
                        )::uuid AS house_member_id
                    FROM "Users" u
                    LEFT JOIN "HouseMembers" hm ON hm."UserId" = u."Id"
                    WHERE hm."Id" IS NULL
                )
                INSERT INTO "HouseMembers" ("Id", "HouseId", "UserId", "Role", "JoinedAt", "CreatedAt", "UpdatedAt")
                SELECT
                    uwh.house_member_id,
                    uwh.house_id,
                    uwh.user_id,
                    1,
                    NOW(),
                    NOW(),
                    NOW()
                FROM users_without_house uwh;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Data backfill is intentionally irreversible.
        }
    }
}
