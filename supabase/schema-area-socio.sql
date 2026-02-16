-- ============================================================
-- Área Socio - Esquema Supabase (Golf Lerma / Saldaña)
-- Ejecutar en Supabase: SQL Editor > New query > Pegar y Run
-- ============================================================

-- Extensión UUID por si no está
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tipos de socio (opcional: usar como enum o solo texto)
-- tipo_socio: titular, conyuge, hijo_18, hijo_19_25, etc.
-- grupo_socio: familia, hermano, individual, etc.

-- ----------------------------------------
-- Tabla: socios
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS socios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre_completo TEXT NOT NULL,
  dni TEXT UNIQUE NOT NULL,
  handicap NUMERIC(4,1),
  fecha_socio DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo_socio TEXT NOT NULL DEFAULT 'titular',
  grupo_socio TEXT,
  email TEXT,
  usuario TEXT UNIQUE,
  password_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE socios IS 'Socios del club. usuario/password_hash para login área socio.';
COMMENT ON COLUMN socios.tipo_socio IS 'Ej: titular, conyuge, hijo_18, hijo_19_25';
COMMENT ON COLUMN socios.grupo_socio IS 'Ej: familia, hermano, individual';

-- Índices para búsqueda
CREATE INDEX IF NOT EXISTS idx_socios_dni ON socios(dni);
CREATE INDEX IF NOT EXISTS idx_socios_nombre ON socios(LOWER(nombre_completo));
CREATE INDEX IF NOT EXISTS idx_socios_usuario ON socios(usuario);

-- ----------------------------------------
-- Tabla: green_fees (uso por fecha)
-- Un registro = un green fee usado por un socio en una fecha
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS green_fees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  socio_id UUID NOT NULL REFERENCES socios(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  tipo_green_fee TEXT NOT NULL DEFAULT 'L12M',
  pago NUMERIC(10,2),
  resultado TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE green_fees IS 'Green fees por socio y fecha. tipo_green_fee ej: L12M (Lerma 12 meses), S12M, etc.';
COMMENT ON COLUMN green_fees.resultado IS 'Opcional: resultado si el socio lo apunta (ej. score, campo)';

CREATE INDEX IF NOT EXISTS idx_green_fees_socio ON green_fees(socio_id);
CREATE INDEX IF NOT EXISTS idx_green_fees_fecha ON green_fees(fecha);

-- ----------------------------------------
-- Tabla: socio_amigos (relación muchos a muchos)
-- ----------------------------------------
CREATE TABLE IF NOT EXISTS socio_amigos (
  socio_id UUID NOT NULL REFERENCES socios(id) ON DELETE CASCADE,
  amigo_id UUID NOT NULL REFERENCES socios(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (socio_id, amigo_id),
  CHECK (socio_id != amigo_id)
);

CREATE INDEX IF NOT EXISTS idx_socio_amigos_socio ON socio_amigos(socio_id);
CREATE INDEX IF NOT EXISTS idx_socio_amigos_amigo ON socio_amigos(amigo_id);

-- ----------------------------------------
-- Trigger updated_at para socios
-- ----------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS socios_updated_at ON socios;
CREATE TRIGGER socios_updated_at
  BEFORE UPDATE ON socios
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------
-- Datos dummy (opcional)
-- ----------------------------------------
INSERT INTO socios (nombre_completo, dni, handicap, fecha_socio, tipo_socio, grupo_socio, usuario, password_hash)
VALUES
  ('Socio Demo', '12345678A', 18.5, '2023-01-15', 'titular', 'individual', 'socio', '$2a$10$dummy.hash.golf2024'),
  ('Roberto Martínez', '87654321B', 12.2, '2022-06-01', 'titular', 'familia', 'roberto', NULL),
  ('Ana García', '11223344C', 15.0, '2023-03-10', 'titular', 'hermano', 'ana', NULL),
  ('Carlos López', '44332211D', 22.0, '2024-01-01', 'titular', 'individual', 'carlos', NULL),
  ('María Sánchez', '55667788E', 20.5, '2022-09-20', 'conyuge', 'familia', NULL, NULL),
  ('Pablo Vega', '99887766F', 28.0, '2023-11-05', 'titular', 'individual', 'pablo', NULL)
ON CONFLICT (dni) DO NOTHING;

-- Algunos green_fees de ejemplo (socio demo)
INSERT INTO green_fees (socio_id, fecha, tipo_green_fee, pago, resultado)
SELECT id, fecha, 'L12M', 0, resultado
FROM socios,
  (VALUES
    (CURRENT_DATE - 5, '76 golpes'),
    (CURRENT_DATE - 12, '74 golpes'),
    (CURRENT_DATE - 20, NULL)
  ) AS v(fecha, resultado)
WHERE usuario = 'socio';

-- Amigos de ejemplo: socio demo sigue a Roberto y Ana
INSERT INTO socio_amigos (socio_id, amigo_id)
SELECT s1.id, s2.id
FROM socios s1, socios s2
WHERE s1.usuario = 'socio' AND s2.usuario IN ('roberto', 'ana')
ON CONFLICT (socio_id, amigo_id) DO NOTHING;
