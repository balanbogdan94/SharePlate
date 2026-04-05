using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SharePlate.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ReconcileSnapshot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_HouseMembers_HouseId",
                table: "HouseMembers");

            migrationBuilder.DropIndex(
                name: "IX_HouseMembers_UserId",
                table: "HouseMembers");

            migrationBuilder.CreateTable(
                name: "HouseJoinRequests",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    HouseId = table.Column<Guid>(type: "uuid", nullable: false),
                    RequesterId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ReviewedById = table.Column<Guid>(type: "uuid", nullable: true),
                    ReviewedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HouseJoinRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HouseJoinRequests_Houses_HouseId",
                        column: x => x.HouseId,
                        principalTable: "Houses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_HouseJoinRequests_Users_RequesterId",
                        column: x => x.RequesterId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_HouseJoinRequests_Users_ReviewedById",
                        column: x => x.ReviewedById,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Houses_Code",
                table: "Houses",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_HouseMembers_HouseId_UserId",
                table: "HouseMembers",
                columns: new[] { "HouseId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_HouseMembers_UserId",
                table: "HouseMembers",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_HouseJoinRequests_HouseId_Status",
                table: "HouseJoinRequests",
                columns: new[] { "HouseId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_HouseJoinRequests_RequesterId",
                table: "HouseJoinRequests",
                column: "RequesterId",
                unique: true,
                filter: "\"Status\" = 1");

            migrationBuilder.CreateIndex(
                name: "IX_HouseJoinRequests_ReviewedById",
                table: "HouseJoinRequests",
                column: "ReviewedById");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "HouseJoinRequests");

            migrationBuilder.DropIndex(
                name: "IX_Houses_Code",
                table: "Houses");

            migrationBuilder.DropIndex(
                name: "IX_HouseMembers_HouseId_UserId",
                table: "HouseMembers");

            migrationBuilder.DropIndex(
                name: "IX_HouseMembers_UserId",
                table: "HouseMembers");

            migrationBuilder.CreateIndex(
                name: "IX_HouseMembers_HouseId",
                table: "HouseMembers",
                column: "HouseId");

            migrationBuilder.CreateIndex(
                name: "IX_HouseMembers_UserId",
                table: "HouseMembers",
                column: "UserId");
        }
    }
}
