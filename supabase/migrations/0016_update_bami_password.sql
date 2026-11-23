-- Update admin password for bami@gmail.fr to 6-character password 'admin0'
update auth.users
set
  encrypted_password = extensions.crypt('admin0', extensions.gen_salt('bf')),
  updated_at = now()
where lower(email) = 'bami@gmail.fr';
