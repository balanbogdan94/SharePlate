using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using SharePlate.Infrastructure.Data;

#nullable disable

namespace SharePlate.Infrastructure.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260618120000_BackfillOwnedHousesForUsers")]
    public partial class BackfillOwnedHousesForUsers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Allow a user to own one house and also be a guest member of another:
            // drop the single-membership-per-user unique index in favour of a plain index.
            migrationBuilder.DropIndex(
                name: "IX_HouseMembers_UserId",
                table: "HouseMembers");

            migrationBuilder.CreateIndex(
                name: "IX_HouseMembers_UserId",
                table: "HouseMembers",
                column: "UserId");

            migrationBuilder.Sql(
                """
                WITH users_without_owned_house AS (
                    SELECT
                        u."Id" AS user_id,
                        u."Name" AS user_name,
                        (
                            substr(md5(u."Id"::text || ':owned-house'), 1, 8) || '-' ||
                            substr(md5(u."Id"::text || ':owned-house'), 9, 4) || '-' ||
                            substr(md5(u."Id"::text || ':owned-house'), 13, 4) || '-' ||
                            substr(md5(u."Id"::text || ':owned-house'), 17, 4) || '-' ||
                            substr(md5(u."Id"::text || ':owned-house'), 21, 12)
                        )::uuid AS house_id
                    FROM "Users" u
                    WHERE NOT EXISTS (
                        SELECT 1 FROM "HouseMembers" hm
                        WHERE hm."UserId" = u."Id" AND hm."Role" = 1
                    )
                )
                INSERT INTO "Houses" ("Id", "Name", "Code", "IsPersonal", "OwnerId", "CreatedAt", "UpdatedAt")
                SELECT
                    uwoh.house_id,
                    uwoh.user_name || '''s House',
                    upper(substr(md5(uwoh.user_id::text || ':owned-house-code'), 1, 4)) || '-' ||
                    upper(substr(md5(uwoh.user_id::text || ':owned-house-code'), 5, 4)),
                    TRUE,
                    uwoh.user_id,
                    NOW(),
                    NOW()
                FROM users_without_owned_house uwoh;
                """);

            migrationBuilder.Sql(
                """
                WITH users_without_owned_house AS (
                    SELECT
                        u."Id" AS user_id,
                        (
                            substr(md5(u."Id"::text || ':owned-house'), 1, 8) || '-' ||
                            substr(md5(u."Id"::text || ':owned-house'), 9, 4) || '-' ||
                            substr(md5(u."Id"::text || ':owned-house'), 13, 4) || '-' ||
                            substr(md5(u."Id"::text || ':owned-house'), 17, 4) || '-' ||
                            substr(md5(u."Id"::text || ':owned-house'), 21, 12)
                        )::uuid AS house_id,
                        (
                            substr(md5(u."Id"::text || ':owned-house-member'), 1, 8) || '-' ||
                            substr(md5(u."Id"::text || ':owned-house-member'), 9, 4) || '-' ||
                            substr(md5(u."Id"::text || ':owned-house-member'), 13, 4) || '-' ||
                            substr(md5(u."Id"::text || ':owned-house-member'), 17, 4) || '-' ||
                            substr(md5(u."Id"::text || ':owned-house-member'), 21, 12)
                        )::uuid AS house_member_id
                    FROM "Users" u
                    WHERE NOT EXISTS (
                        SELECT 1 FROM "HouseMembers" hm
                        WHERE hm."UserId" = u."Id" AND hm."Role" = 1
                    )
                )
                INSERT INTO "HouseMembers" ("Id", "HouseId", "UserId", "Role", "JoinedAt", "CreatedAt", "UpdatedAt")
                SELECT
                    uwoh.house_member_id,
                    uwoh.house_id,
                    uwoh.user_id,
                    1,
                    NOW(),
                    NOW(),
                    NOW()
                FROM users_without_owned_house uwoh;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_HouseMembers_UserId",
                table: "HouseMembers");

            migrationBuilder.CreateIndex(
                name: "IX_HouseMembers_UserId",
                table: "HouseMembers",
                column: "UserId",
                unique: true);

            // Data backfill is intentionally irreversible.
        }
    }
}
