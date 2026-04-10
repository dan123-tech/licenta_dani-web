-- Replace vehicle category enum values with Romanian category codes.
-- Old values (Sedan/Suv/...) are mapped to OTHER.

DO $$ BEGIN
  CREATE TYPE "VehicleCategory_v2" AS ENUM (
    'AM','A1','A2','A',
    'B1','B','BE',
    'C1','C','C1E','CE',
    'D1','D','D1E','DE',
    'TR','TB','TV',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Normalize any existing old values to OTHER before casting.
UPDATE "Car"
SET "vehicleCategory" = 'Other'
WHERE "vehicleCategory"::text IN ('Sedan','Suv','Hatchback','Wagon','Coupe','Van','Truck');

ALTER TABLE "Car"
  ALTER COLUMN "vehicleCategory" DROP DEFAULT;

ALTER TABLE "Car"
  ALTER COLUMN "vehicleCategory" TYPE "VehicleCategory_v2"
  USING (CASE
    WHEN "vehicleCategory"::text IN ('AM','A1','A2','A','B1','B','BE','C1','C','C1E','CE','D1','D','D1E','DE','TR','TB','TV','OTHER')
      THEN "vehicleCategory"::text::"VehicleCategory_v2"
    WHEN "vehicleCategory"::text = 'Other'
      THEN 'OTHER'::"VehicleCategory_v2"
    ELSE 'OTHER'::"VehicleCategory_v2"
  END);

ALTER TABLE "Car"
  ALTER COLUMN "vehicleCategory" SET DEFAULT 'OTHER';

-- Swap types: drop old, rename v2 to canonical name.
DO $$ BEGIN
  DROP TYPE "VehicleCategory";
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

ALTER TYPE "VehicleCategory_v2" RENAME TO "VehicleCategory";

