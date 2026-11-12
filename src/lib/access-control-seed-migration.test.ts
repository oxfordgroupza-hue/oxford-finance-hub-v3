import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { permissionCatalogue, roleTemplates } from "./access-control";

const seedMigration = readFileSync(
  resolve(
    process.cwd(),
    "netlify/database/migrations/20261111200000_m23_seed_access_control.sql",
  ),
  "utf8",
);
const bootstrapMigration = readFileSync(
  resolve(
    process.cwd(),
    "netlify/database/migrations/20261111210000_m23_initial_super_admin_provisioning.sql",
  ),
  "utf8",
);
const sqlLiteral = (value: string) => "'" + value.replaceAll("'", "''") + "'";

describe("initial access-control database seed", () => {
  it("seeds every permission definition from the shared catalogue", () => {
    for (const permission of permissionCatalogue) {
      expect(seedMigration).toContain("(" + sqlLiteral(permission.key) + ",");
    }
  });

  it("seeds every built-in role and all non-reserved role grants", () => {
    for (const role of roleTemplates) {
      expect(seedMigration).toContain(
        "(" + [sqlLiteral(role.key), sqlLiteral(role.name)].join(", ") + ",",
      );
      if (!role.reserved) {
        for (const permission of role.permissions) {
          expect(seedMigration).toContain(sqlLiteral(permission));
        }
      }
    }
  });

  it("runs before M23 and never creates or promotes a user", () => {
    expect(
      "20261111200000_m23_seed_access_control.sql".localeCompare(
        "20261111210000_m23_initial_super_admin_provisioning.sql",
      ),
    ).toBeLessThan(0);
    expect(seedMigration).not.toMatch(/INSERT\s+INTO\s+(users|staff_roles)/i);
    expect(bootstrapMigration).toContain("WHERE key = 'super_administrator'");
    expect(bootstrapMigration).toContain("super_role.is_reserved");
    expect(bootstrapMigration).toContain("super_role.is_active");
  });
});
