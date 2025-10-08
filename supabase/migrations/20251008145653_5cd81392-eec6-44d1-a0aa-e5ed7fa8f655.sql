-- Change table_number from integer to text to support multiple table numbers
ALTER TABLE vendor_applications 
ALTER COLUMN table_number TYPE text USING table_number::text;