-- 015_contacts_birthday.sql

ALTER TABLE people 
  ADD COLUMN email TEXT,
  ADD COLUMN phone TEXT,
  ADD COLUMN birthday DATE,
  ADD COLUMN anniversary DATE;
