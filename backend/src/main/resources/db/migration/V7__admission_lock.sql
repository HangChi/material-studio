CREATE TABLE admission_lock (
 id INT PRIMARY KEY,
 CHECK (id = 1)
);
INSERT INTO admission_lock(id) VALUES (1);
