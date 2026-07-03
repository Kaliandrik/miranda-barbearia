-- Adiciona coluna para rastrear quais lembretes já foram enviados
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminders_sent TEXT[] DEFAULT '{}';
