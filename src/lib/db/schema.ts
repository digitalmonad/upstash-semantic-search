import { doublePrecision, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const apartmentTable = pgTable("apartment", {
  id: text("id").primaryKey().default("uuid_generate_v4()"),
  name: text("name").notNull(),
  imageId: text("imageId").notNull(),
  price: doublePrecision("price").notNull(),
  description: text("description"),
});

export type Apartment = typeof apartmentTable.$inferSelect;
