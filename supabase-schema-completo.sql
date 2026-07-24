-- =============================================================================
-- SEPRI — Esquema completo de base de datos (Supabase / PostgreSQL)
-- =============================================================================
-- Ejecutar COMPLETO en Supabase → SQL Editor del proyecto de tu .env
--
-- Replica tablas, vistas, funciones, índices, RLS, storage y datos semilla.
-- Idempotente: seguro re-ejecutar en proyectos existentes (usa IF NOT EXISTS).
--
-- Login por defecto tras ejecutar: admin / admin
--
-- Datos (export/import): scripts/export-supabase-datos.mjs y scripts/import-supabase-datos.mjs
--
-- Scripts auxiliares (requieren funciones de este archivo):
--   supabase-datos-vaciar.sql    → TRUNCATE + sepri_seed_catalogos()
--   supabase-datos-secuencias.sql → sepri_reset_secuencias()
--   supabase-datos-pgdump.sql    → guía pg_dump/pg_restore
-- =============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- ── Extensiones ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── Funciones auxiliares ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.sepri_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Catálogo de áreas + usuario admin (reutilizado por schema y datos-vaciar)
CREATE OR REPLACE FUNCTION public.sepri_seed_catalogos()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.area (id, area, encargado_id) VALUES
    ('DIGE', 'Dirección General', NULL),
    ('OAIP', 'Oficina de Libre Acceso a la Información Pública', NULL),
    ('JURI', 'Departamento Jurídico', NULL),
    ('RRHH', 'Departamento de Recursos Humanos', NULL),
    ('PYDE', 'Departamento de Planificación y Desarrollo', NULL),
    ('COGI', 'División Control de Gestión Interna', NULL),
    ('SEFI', 'División de Seguridad', NULL),
    ('TECO', 'División de Tecnologías de la Información y Comunicación', NULL),
    ('ADFI', 'Departamento Administrativo y Financiero', NULL),
    ('DIAR', 'Departamento de Diseño y Arquitectura', NULL),
    ('GEIE', 'Departamento de Gestión de Infraestructura Escolar', NULL),
    ('GERI', 'Departamento Gestión de Riesgo', NULL),
    ('MANO', 'Departamento de Mantenimiento de Obras', NULL),
    ('SUPO', 'Departamento Supervisión de Obras', NULL),
    ('FISO', 'Departamento Fiscalización de Obras', NULL),
    ('CUBI', 'Departamento de Cubicaciones', NULL),
    ('COOR', 'Departamento de Coordinación Regional', NULL)
  ON CONFLICT (id) DO NOTHING;

  DELETE FROM public.usuarios_app WHERE lower(trim(usuario)) = 'admin';

  INSERT INTO public.usuarios_app (
    usuario, password, nombre, apellido, cargo, area, rol, permisos, activo
  ) VALUES (
    'admin', 'admin', 'Administrador', 'Sistema', 'Administrador', 'Ninguna', 'admin',
    '{
      "crear_usuarios": true, "editar_usuarios": true,
      "ver_dashboard": true, "editar_dashboard": true,
      "ver_obras": true, "editar_obras": true,
      "ver_techado": true, "editar_techado": true,
      "ver_carga_obras": true, "editar_carga_obras": true,
      "ver_tramites": true, "editar_tramites": true,
      "ver_atencion_contratista": true, "editar_atencion_contratista": true,
      "ver_configuracion": true, "editar_configuracion": true,
      "ver_reporte": true, "editar_reporte": true
    }'::jsonb,
    true
  );
END;
$$;

-- Ajustar secuencias tras importar datos (reutilizado por datos-secuencias.sql)
CREATE OR REPLACE FUNCTION public.sepri_reset_secuencias()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT * FROM (VALUES
      ('historial_estados', 'id'),
      ('movimientos_tramites', 'id'),
      ('historial_uploads', 'id'),
      ('tiempo_en_area', 'id'),
      ('notificaciones_tiempo', 'id'),
      ('notificacion_leida', 'id'),
      ('movimientos_solicitud_contratista', 'id'),
      ('contratista_access_tokens', 'id')
    ) AS t(tbl, col)
  LOOP
    EXECUTE format(
      'SELECT setval(pg_get_serial_sequence(%L, %L), COALESCE((SELECT MAX(%I) FROM public.%I), 1))',
      'public.' || rec.tbl, rec.col, rec.col, rec.tbl
    );
  END LOOP;

  PERFORM setval(
    'public.formulario_contratista_id_seq',
    GREATEST(
      COALESCE((
        SELECT MAX(NULLIF(regexp_replace(id, '\D', '', 'g'), '')::bigint)
        FROM public.formulario_contratista
        WHERE id ~ '^FC-\d+$'
      ), 0),
      1
    )
  );
END;
$$;

-- =============================================================================
-- 1) USUARIOS Y CATÁLOGOS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.usuarios_app (
  id          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  usuario     text NOT NULL,
  password    text NOT NULL,
  nombre      text,
  apellido    text,
  cargo       text,
  area        text DEFAULT 'Ninguna',
  rol         text NOT NULL DEFAULT 'usuario',
  permisos    jsonb NOT NULL DEFAULT '{}'::jsonb,
  activo      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'usuarios_app' AND column_name = 'usuario'
  ) THEN
    ALTER TABLE public.usuarios_app ADD COLUMN usuario text;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'usuarios_app' AND column_name = 'nombre_usuario'
  ) THEN
    UPDATE public.usuarios_app SET usuario = nombre_usuario WHERE usuario IS NULL OR usuario = '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'usuarios_app' AND column_name = 'activo'
  ) THEN
    ALTER TABLE public.usuarios_app ADD COLUMN activo boolean NOT NULL DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'usuarios_app' AND column_name = 'rol'
  ) THEN
    ALTER TABLE public.usuarios_app ADD COLUMN rol text NOT NULL DEFAULT 'usuario';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'usuarios_app' AND column_name = 'permisos'
  ) THEN
    ALTER TABLE public.usuarios_app ADD COLUMN permisos jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_app_usuario_unique ON public.usuarios_app (usuario);

CREATE TABLE IF NOT EXISTS public.area (
  id           text PRIMARY KEY,
  area         text NOT NULL,
  encargado_id text REFERENCES public.usuarios_app(id)
);

-- =============================================================================
-- 2) OBRAS Y CONTRATISTAS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.contratistas (
  id              text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  responsable     varchar(400) NOT NULL,
  identificacion  varchar(100),
  telefono1       varchar(100),
  telefono2       varchar(100),
  correo          varchar(100),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS contratistas_responsable_unique
  ON public.contratistas (lower(trim(responsable)));

CREATE TABLE IF NOT EXISTS public.obras (
  id                          text PRIMARY KEY,
  codigo                      varchar(100),
  contrato                    varchar(9),
  nombre                      varchar(200) NOT NULL,
  nombre_inaugurado           varchar(100),
  tipo_obra                   varchar(100),
  tipo                        varchar(20) NOT NULL DEFAULT 'Arrastre',
  estado                      varchar(120) NOT NULL,
  fecha_inicio                date,
  fecha_fin_estimada          date,
  fecha_detenida              date,
  fecha_inauguracion          date,
  contratista_id              text REFERENCES public.contratistas(id) ON DELETE SET NULL,
  descripcion                 text,
  provincia                   varchar(200),
  municipio                   varchar(200),
  nivel                       varchar(200),
  no_aula                     integer,
  sorteo                      varchar(100),
  area_construccion           varchar(100),
  coordinador                 varchar(100),
  supervisor                  varchar(100),
  porcentaje_ejecutado        numeric(7, 2),
  presupuesto_total           numeric(18, 2),
  avance_inicial              numeric(18, 2),
  numero_ultima_cubicacion    varchar(100),
  tipo_ultima_cubicacion      varchar(100),
  estatus_ultima_cubicacion   varchar(100),
  grupo_ultimo_estatus_cubicacion varchar(100),
  total_ultima_cubicacion     numeric(18, 2),
  ultima_total_cubicado       numeric(18, 2),
  total_cubicado_base         numeric(18, 2),
  total_pagado                numeric(18, 2),
  snip                        varchar(100),
  envio_snip                  varchar(100),
  monto_snip                  numeric(18, 2),
  modificacion_snip           varchar(100),
  observacion_legal           text,
  observacion_financiero      text,
  latitud                     varchar(100),
  longitud                    varchar(100),
  distrito_minerd_sigede      varchar(200),
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.obras
  ADD COLUMN IF NOT EXISTS contrato varchar(9),
  ADD COLUMN IF NOT EXISTS tipo_obra varchar(100),
  ADD COLUMN IF NOT EXISTS contratista_id text REFERENCES public.contratistas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS nombre_inaugurado varchar(100),
  ADD COLUMN IF NOT EXISTS sorteo varchar(100),
  ADD COLUMN IF NOT EXISTS area_construccion varchar(100),
  ADD COLUMN IF NOT EXISTS coordinador varchar(100),
  ADD COLUMN IF NOT EXISTS supervisor varchar(100),
  ADD COLUMN IF NOT EXISTS porcentaje_ejecutado numeric(7, 2),
  ADD COLUMN IF NOT EXISTS presupuesto_total numeric(18, 2),
  ADD COLUMN IF NOT EXISTS avance_inicial numeric(18, 2),
  ADD COLUMN IF NOT EXISTS numero_ultima_cubicacion varchar(100),
  ADD COLUMN IF NOT EXISTS tipo_ultima_cubicacion varchar(100),
  ADD COLUMN IF NOT EXISTS estatus_ultima_cubicacion varchar(100),
  ADD COLUMN IF NOT EXISTS grupo_ultimo_estatus_cubicacion varchar(100),
  ADD COLUMN IF NOT EXISTS total_ultima_cubicacion numeric(18, 2),
  ADD COLUMN IF NOT EXISTS ultima_total_cubicado numeric(18, 2),
  ADD COLUMN IF NOT EXISTS total_cubicado_base numeric(18, 2),
  ADD COLUMN IF NOT EXISTS total_pagado numeric(18, 2),
  ADD COLUMN IF NOT EXISTS fecha_detenida date,
  ADD COLUMN IF NOT EXISTS snip varchar(100),
  ADD COLUMN IF NOT EXISTS envio_snip varchar(100),
  ADD COLUMN IF NOT EXISTS monto_snip numeric(18, 2),
  ADD COLUMN IF NOT EXISTS modificacion_snip varchar(100);

-- Vistas legadas de proyectos antiguos (bloquean ALTER TYPE en columnas de obras)
DROP VIEW IF EXISTS public.dashboard_stats CASCADE;

ALTER TABLE public.obras ALTER COLUMN estado TYPE varchar(120);
ALTER TABLE public.obras ALTER COLUMN codigo TYPE varchar(100);
ALTER TABLE public.obras ALTER COLUMN tipo_obra TYPE varchar(100);
ALTER TABLE public.obras ALTER COLUMN nombre TYPE varchar(200);
ALTER TABLE public.obras ALTER COLUMN provincia TYPE varchar(200);
ALTER TABLE public.obras ALTER COLUMN municipio TYPE varchar(200);
ALTER TABLE public.obras ALTER COLUMN nivel TYPE varchar(200);
ALTER TABLE public.obras ALTER COLUMN latitud TYPE varchar(100);
ALTER TABLE public.obras ALTER COLUMN longitud TYPE varchar(100);
ALTER TABLE public.obras ALTER COLUMN distrito_minerd_sigede TYPE varchar(200);
ALTER TABLE public.obras ALTER COLUMN descripcion TYPE text;
ALTER TABLE public.obras ALTER COLUMN observacion_legal TYPE text;
ALTER TABLE public.obras ALTER COLUMN observacion_financiero TYPE text;

-- Tipo gestión técnica: Arrastre (SIGEDE) vs Mantenimiento (contrato, sin SIGEDE)
ALTER TABLE public.obras
  ADD COLUMN IF NOT EXISTS tipo varchar(20) NOT NULL DEFAULT 'Arrastre';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'obras_tipo_check' AND conrelid = 'public.obras'::regclass
  ) THEN
    ALTER TABLE public.obras
      ADD CONSTRAINT obras_tipo_check
      CHECK (tipo IN ('Arrastre', 'Mantenimiento'));
  END IF;
END $$;

ALTER TABLE public.obras ALTER COLUMN codigo DROP NOT NULL;

COMMENT ON COLUMN public.obras.tipo IS
  'Clasificación gestión técnica: Arrastre (con SIGEDE) o Mantenimiento (sin SIGEDE, con contrato).';
COMMENT ON COLUMN public.obras.codigo IS
  'Código SIGEDE del arrastre. NULL en obras de tipo Mantenimiento (gestión técnica).';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'obras' AND column_name = 'responsable'
  ) THEN
    INSERT INTO public.contratistas (responsable)
    SELECT DISTINCT left(trim(o.responsable), 400)
    FROM public.obras o
    WHERE o.responsable IS NOT NULL
      AND trim(o.responsable) <> ''
      AND NOT EXISTS (
        SELECT 1 FROM public.contratistas c
        WHERE lower(trim(c.responsable)) = lower(left(trim(o.responsable), 400))
      );

    UPDATE public.obras o
    SET contratista_id = c.id
    FROM public.contratistas c
    WHERE o.contratista_id IS NULL
      AND o.responsable IS NOT NULL
      AND trim(o.responsable) <> ''
      AND lower(trim(c.responsable)) = lower(left(trim(o.responsable), 400));

    ALTER TABLE public.obras DROP COLUMN IF EXISTS responsable;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.historial_estados (
  id               bigserial PRIMARY KEY,
  codigo           varchar(100),
  obra_id          bigint,
  estado_anterior  text,
  estado_nuevo     text NOT NULL,
  fecha_cambio     timestamptz DEFAULT now(),
  usuario          text,
  observaciones    text
);

ALTER TABLE public.historial_estados
  ADD COLUMN IF NOT EXISTS codigo varchar(100);

-- =============================================================================
-- 3) TRÁMITES Y SEGUIMIENTO
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.tramites (
  id                  text PRIMARY KEY,
  titulo              text NOT NULL,
  oficio              text,
  nombre_destinatario text NOT NULL,
  area_destinatario   text NOT NULL,
  area_destino_final  text NOT NULL,
  proceso             text,
  estado              text NOT NULL DEFAULT 'en_transito',
  codigo_barras       text,
  archivo_pdf         text,
  nombre_archivo      text,
  tipo_tramite        text,
  fecha_creacion      timestamptz DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  id_sigede           text[] NOT NULL DEFAULT '{}',
  obra_ids            text[] NOT NULL DEFAULT '{}'
);

ALTER TABLE public.tramites ADD COLUMN IF NOT EXISTS proceso text;
ALTER TABLE public.tramites ADD COLUMN IF NOT EXISTS id_sigede text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.tramites ADD COLUMN IF NOT EXISTS obra_ids text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.tramites.id_sigede IS
  'Códigos SIGEDE (codigo o distrito_minerd_sigede) de obras vinculadas al trámite.';
COMMENT ON COLUMN public.tramites.obra_ids IS
  'Ids internos de obras sin SIGEDE (MT-xxxx / OB-xxxx) vinculadas al trámite.';

CREATE TABLE IF NOT EXISTS public.movimientos_tramites (
  id                bigserial PRIMARY KEY,
  tramite_id        text NOT NULL REFERENCES public.tramites(id) ON DELETE CASCADE,
  area_origen       text NOT NULL,
  area_destino      text NOT NULL,
  oficio            text,
  fecha_movimiento  timestamptz NOT NULL DEFAULT now(),
  observaciones     text,
  usuario           text,
  estado_resultante text,
  tipo_tramite      text
);

CREATE TABLE IF NOT EXISTS public.historial_uploads (
  id                   bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  nombre_archivo       text NOT NULL,
  tipo_archivo         text NOT NULL,
  fecha_subida         timestamptz DEFAULT now(),
  registros_procesados int,
  registros_exitosos   int,
  registros_fallidos   int,
  usuario              text,
  observaciones        text
);

COMMENT ON TABLE public.historial_uploads IS
  'Registro de cada archivo subido en Cargar Obras (XML/Excel).';

CREATE TABLE IF NOT EXISTS public.tiempo_en_area (
  id            bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  tramite_id    text NOT NULL REFERENCES public.tramites(id) ON DELETE CASCADE,
  area_nombre   text NOT NULL,
  fecha_entrada timestamptz NOT NULL DEFAULT now(),
  fecha_salida  timestamptz,
  proceso_id    text NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tiempo_en_area_tramite_id ON public.tiempo_en_area(tramite_id);
CREATE INDEX IF NOT EXISTS idx_tiempo_en_area_fecha_salida
  ON public.tiempo_en_area(tramite_id) WHERE fecha_salida IS NULL;

COMMENT ON TABLE public.tiempo_en_area IS
  'Tiempo que un trámite permanece en cada área; solo se usa cuando el trámite tiene proceso asignado.';

CREATE TABLE IF NOT EXISTS public.notificaciones_tiempo (
  id                bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  tiempo_en_area_id bigint NOT NULL REFERENCES public.tiempo_en_area(id) ON DELETE CASCADE,
  tramite_id        text NOT NULL,
  tramite_titulo    text NOT NULL,
  area_nombre       text NOT NULL,
  porcentaje        int NOT NULL CHECK (porcentaje IN (50, 70, 100)),
  mensaje           text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_tiempo_una_por_porcentaje
  ON public.notificaciones_tiempo(tiempo_en_area_id, porcentaje);
CREATE INDEX IF NOT EXISTS idx_notif_tiempo_area ON public.notificaciones_tiempo(area_nombre);
CREATE INDEX IF NOT EXISTS idx_notif_tiempo_created ON public.notificaciones_tiempo(created_at DESC);

CREATE TABLE IF NOT EXISTS public.notificacion_leida (
  id              bigint GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  notificacion_id bigint NOT NULL REFERENCES public.notificaciones_tiempo(id) ON DELETE CASCADE,
  usuario_id      text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(notificacion_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_notif_leida_usuario ON public.notificacion_leida(usuario_id);

-- =============================================================================
-- 4) ATENCIÓN AL CONTRATISTA
-- =============================================================================

CREATE SEQUENCE IF NOT EXISTS formulario_contratista_id_seq START 1;

CREATE TABLE IF NOT EXISTS public.formulario_contratista (
  id text PRIMARY KEY DEFAULT ('FC-' || LPAD(nextval('formulario_contratista_id_seq')::text, 6, '0')),
  fecha_visita date NOT NULL,
  nombres text NOT NULL,
  apellidos text NOT NULL,
  nombre_empresa text NOT NULL,
  motivo_visita text NOT NULL CHECK (
    motivo_visita IN (
      'Adenda', 'Contrato', 'Equilibrio economico', 'Linea de credito',
      'Pago de cubicación', 'Mantenimiento Correctivo', 'Aula movil', 'Otras'
    )
  ),
  nombre_obra text,
  nombre_obra_inaugurada text,
  provincia text NOT NULL CHECK (
    provincia IN (
      'Azua', 'Bahoruco', 'Barahona', 'Dajabón', 'Distrito Nacional', 'Duarte',
      'Elías Piña', 'El Seibo', 'Espaillat', 'Hato Mayor', 'Hermanas Mirabal',
      'Independencia', 'La Altagracia', 'La Romana', 'La Vega', 'María Trinidad Sánchez',
      'Monseñor Nouel', 'Monte Cristi', 'Monte Plata', 'Pedernales', 'Peravia',
      'Puerto Plata', 'Samaná', 'San Cristóbal', 'San José de Ocoa', 'San Juan',
      'San Pedro de Macorís', 'Sánchez Ramírez', 'Santiago', 'Santiago Rodríguez',
      'Santo Domingo', 'Valverde'
    )
  ),
  numero_contrato text NOT NULL,
  correo text NOT NULL,
  nota text,
  area_actual text,
  estado text NOT NULL DEFAULT 'pendiente_asignacion' CHECK (
    estado IN ('pendiente_asignacion', 'en_seguimiento', 'detenido', 'completado')
  )
);

ALTER TABLE public.formulario_contratista
  ADD COLUMN IF NOT EXISTS area_actual text,
  ADD COLUMN IF NOT EXISTS estado text;

UPDATE public.formulario_contratista
SET estado = 'pendiente_asignacion'
WHERE estado IS NULL;

ALTER TABLE public.formulario_contratista
  ALTER COLUMN estado SET DEFAULT 'pendiente_asignacion';

CREATE TABLE IF NOT EXISTS public.movimientos_solicitud_contratista (
  id bigserial PRIMARY KEY,
  solicitud_id text NOT NULL REFERENCES public.formulario_contratista(id) ON DELETE CASCADE,
  area_origen text NOT NULL,
  area_destino text NOT NULL,
  nota text,
  estado_resultante text CHECK (
    estado_resultante IS NULL OR estado_resultante IN ('detenido', 'completado')
  ),
  usuario text,
  fecha_movimiento timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_movimientos_solicitud_contratista_solicitud
  ON public.movimientos_solicitud_contratista (solicitud_id);

CREATE TABLE IF NOT EXISTS public.contratista_access_tokens (
  id               bigserial PRIMARY KEY,
  solicitud_id     text NOT NULL REFERENCES public.formulario_contratista(id) ON DELETE CASCADE,
  token            text NOT NULL UNIQUE,
  is_active        boolean NOT NULL DEFAULT true,
  access_count     integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  last_accessed_at timestamptz
);

-- =============================================================================
-- 5) DOCUMENTOS TÉCNICOS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.documentos_tecnicos_obra (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud                varchar(75) NOT NULL,
  cuadrantes               varchar(120),
  tipo_adenda              varchar(120),
  no_adenda_solicituda     integer,
  contratista_id           text REFERENCES public.contratistas(id) ON DELETE SET NULL,
  id_sigede                text[] NOT NULL DEFAULT '{}',
  obra_ids                 text[] NOT NULL DEFAULT '{}',
  tipo_adenda_anterior     varchar(120),
  numero_adenda_anterior   varchar(12),
  numero_adenda_actual     varchar(12),
  observacion              text,
  monto_contrato_base      numeric(18, 2),
  monto_adenda_anterior    numeric(18, 2),
  monto_adenda_solicitada  numeric(18, 2),
  monto_total              numeric(18, 2),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT documentos_tecnicos_obra_solicitud_unique UNIQUE (solicitud)
);

CREATE TABLE IF NOT EXISTS public.movimiento_documentos_tecnicos_obra (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitud     varchar(75) NOT NULL
                  REFERENCES public.documentos_tecnicos_obra(solicitud) ON DELETE CASCADE,
  fecha_solicitud date,
  fecha_entrada date,
  no_tramite    varchar(120),
  oficio        varchar(120),
  estatus       varchar(40),
  departamento  text REFERENCES public.area(id) ON DELETE SET NULL,
  fecha_salida  date,
  observaciones text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Migraciones desde esquemas anteriores de documentos técnicos
ALTER TABLE public.documentos_tecnicos_obra
  ADD COLUMN IF NOT EXISTS observacion text,
  ADD COLUMN IF NOT EXISTS tipo_adenda_anterior varchar(120),
  ADD COLUMN IF NOT EXISTS numero_adenda_anterior varchar(12),
  ADD COLUMN IF NOT EXISTS numero_adenda_actual varchar(12),
  ADD COLUMN IF NOT EXISTS no_adenda_solicituda integer,
  ADD COLUMN IF NOT EXISTS monto_contrato_base numeric(18, 2),
  ADD COLUMN IF NOT EXISTS monto_adenda_anterior numeric(18, 2),
  ADD COLUMN IF NOT EXISTS monto_adenda_solicitada numeric(18, 2),
  ADD COLUMN IF NOT EXISTS monto_total numeric(18, 2);

-- Migraciones legado documentos técnicos (un solo bloque)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'documentos_tecnicos_obra'
      AND column_name = 'adenda_anterior'
  ) THEN
    UPDATE public.documentos_tecnicos_obra
    SET tipo_adenda_anterior = adenda_anterior
    WHERE tipo_adenda_anterior IS NULL AND adenda_anterior IS NOT NULL;
    ALTER TABLE public.documentos_tecnicos_obra DROP COLUMN adenda_anterior;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'documentos_tecnicos_obra'
      AND column_name = 'no_adenda_solicitud'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'documentos_tecnicos_obra'
      AND column_name = 'no_adenda_solicituda'
  ) THEN
    ALTER TABLE public.documentos_tecnicos_obra
      RENAME COLUMN no_adenda_solicitud TO no_adenda_solicituda;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'documentos_tecnicos_obra'
      AND column_name = 'no_adenda_solicitud'
      AND data_type IN ('character varying', 'text')
  ) THEN
    ALTER TABLE public.documentos_tecnicos_obra
      ALTER COLUMN no_adenda_solicitud TYPE integer
      USING CASE
        WHEN no_adenda_solicitud IS NULL OR trim(no_adenda_solicitud::text) = '' THEN NULL
        ELSE trim(no_adenda_solicitud::text)::integer
      END;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'documentos_tecnicos_obra'
      AND column_name = 'numero_adenda_anterior' AND data_type = 'integer'
  ) THEN
    ALTER TABLE public.documentos_tecnicos_obra
      ALTER COLUMN numero_adenda_anterior TYPE varchar(12)
      USING CASE
        WHEN numero_adenda_anterior IS NULL THEN NULL
        ELSE numero_adenda_anterior::text
      END;
  END IF;
END $$;

ALTER TABLE public.documentos_tecnicos_obra
  ADD COLUMN IF NOT EXISTS obra_ids text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.movimiento_documentos_tecnicos_obra
  ADD COLUMN IF NOT EXISTS fecha_entrada date,
  ADD COLUMN IF NOT EXISTS oficio varchar(120),
  ADD COLUMN IF NOT EXISTS estatus varchar(40),
  ADD COLUMN IF NOT EXISTS observaciones text;

COMMENT ON COLUMN public.documentos_tecnicos_obra.obra_ids IS
  'IDs de obras de mantenimiento (obras.id, ej. MT-xxxx) vinculadas al documento.';

CREATE INDEX IF NOT EXISTS idx_documentos_tecnicos_solicitud
  ON public.documentos_tecnicos_obra(solicitud);
CREATE INDEX IF NOT EXISTS idx_documentos_tecnicos_contratista
  ON public.documentos_tecnicos_obra(contratista_id);
CREATE INDEX IF NOT EXISTS idx_mov_doc_tecnicos_solicitud
  ON public.movimiento_documentos_tecnicos_obra(solicitud);
CREATE INDEX IF NOT EXISTS idx_mov_doc_tecnicos_departamento
  ON public.movimiento_documentos_tecnicos_obra(departamento);
CREATE INDEX IF NOT EXISTS idx_mov_doc_tecnicos_solicitud_tramite
  ON public.movimiento_documentos_tecnicos_obra(solicitud, lower(trim(no_tramite)))
  WHERE no_tramite IS NOT NULL AND trim(no_tramite) <> '';

-- FK diferida: movimientos_tramites (§3) se define antes que esta tabla
ALTER TABLE public.movimientos_tramites
  ADD COLUMN IF NOT EXISTS movimiento_documento_id uuid
    REFERENCES public.movimiento_documentos_tecnicos_obra(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mov_tramites_mov_documento
  ON public.movimientos_tramites (movimiento_documento_id)
  WHERE movimiento_documento_id IS NOT NULL;

-- =============================================================================
-- 6) TECHADO (contrato + matriz_general)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.contrato (
  id                      text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  lote                    integer NOT NULL,
  no_contrato             varchar(9) NOT NULL,
  contratista_nombre      text,
  contratista_id          text REFERENCES public.contratistas(id) ON DELETE SET NULL,
  fecha_contrato          date,
  presupuesto_centro      numeric(16, 2),
  estatus_contrato        text,
  proceso                 text,
  certificacion           text,
  monto_total_inversion   numeric(16, 2),
  monto_total_contrato    numeric(16, 2),
  avance_20_porciento     numeric(16, 2),
  cubicacion_enviada      text,
  libramiento             text,
  fecha_salida            date,
  observaciones           text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contrato_lote_no_unique UNIQUE (lote, no_contrato)
);

-- FK diferida: documentos_tecnicos_obra (§5) se define antes que contrato
ALTER TABLE public.documentos_tecnicos_obra
  ADD COLUMN IF NOT EXISTS contrato_id text REFERENCES public.contrato(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documentos_tecnicos_contrato_id
  ON public.documentos_tecnicos_obra(contrato_id);

-- Obras → contrato (N:1). contrato (varchar) queda legado; preferir contrato_id.
ALTER TABLE public.obras
  ADD COLUMN IF NOT EXISTS contrato_id text REFERENCES public.contrato(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.contrato_adenda (
  id             text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  contrato_id    text NOT NULL REFERENCES public.contrato(id) ON DELETE CASCADE,
  tipo_adenda    text,
  certificacion  text,
  monto_adendado numeric(16, 2),
  fecha_adenda   date,
  observaciones  text,
  orden          integer NOT NULL DEFAULT 1,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Adendas — Gestión técnica de documento (N adendas → 1 contrato)
CREATE TABLE IF NOT EXISTS public.adenda (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id   text NOT NULL REFERENCES public.contrato(id) ON DELETE CASCADE,
  numero_adenda varchar(12),
  tipo_adenda   varchar(120),
  monto         numeric(18, 2),
  estado        varchar(20) NOT NULL DEFAULT 'en_curso'
                  CHECK (estado IN ('en_curso', 'anterior')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT adenda_contrato_numero_unique UNIQUE (contrato_id, numero_adenda)
);

ALTER TABLE public.adenda
  ADD COLUMN IF NOT EXISTS obra_id text REFERENCES public.obras(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_adenda_obra_id
  ON public.adenda(obra_id) WHERE obra_id IS NOT NULL;

-- Comentarios / evidencia PDF (documento o adenda)
CREATE TABLE IF NOT EXISTS public.documento_tecnico_comentario (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id   uuid NOT NULL
                   REFERENCES public.documentos_tecnicos_obra(id) ON DELETE CASCADE,
  adenda_id      uuid
                   REFERENCES public.adenda(id) ON DELETE CASCADE,
  comentario     text NOT NULL,
  usuario        text NOT NULL,
  archivo_pdf    text,
  nombre_archivo text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT documento_tecnico_comentario_texto_chk
    CHECK (length(trim(comentario)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_gt_comentario_documento
  ON public.documento_tecnico_comentario(documento_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gt_comentario_adenda
  ON public.documento_tecnico_comentario(adenda_id, created_at DESC)
  WHERE adenda_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.matriz_general (
  id                              text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  contrato_id                     text NOT NULL REFERENCES public.contrato(id) ON DELETE CASCADE,
  lote                            integer NOT NULL,
  plantel                         text NOT NULL,
  provincia                       text,
  municipio                       text,
  reg_dist                        varchar(20),
  obra_id                         text REFERENCES public.obras(id) ON DELETE SET NULL,
  ejecucion_actual                text,
  observaciones                   text,
  estatus                         varchar(80),
  porcentaje_ejecucion            numeric(8, 4),
  porcentaje_ejecucion_alt        numeric(8, 4),
  fecha_inauguracion              date,
  anio_proceso                    integer,
  monto_contratado_centro         numeric(16, 2),
  monto_cubicado_centro           numeric(16, 2),
  porcentaje_cubicado_centro      numeric(8, 4),
  monto_total_cubicado_sin_amort  numeric(16, 2),
  porciento_cubicado              numeric(8, 4),
  pendiente_a_cubicar             numeric(16, 2),
  monto_total_pagado              numeric(16, 2),
  monto_avance_centro             numeric(16, 2),
  fecha_ultima_cubicacion         date,
  estatus_ultima_cubicacion       text,
  numero_ultima_cubicacion        text,
  monto_ultima_cubicacion         numeric(16, 2),
  valor_cubicado_presupuesto_base numeric(16, 2),
  adicional_cubicacion            numeric(16, 2),
  movimiento_tierra               text,
  obs_movimiento_tierra           text,
  obs_planos_arquitectonicos      text,
  obs_diseno                      text,
  as_built                        text,
  diseno_arquitectonico           text,
  diseno_estructural              text,
  diseno_sanitario                text,
  diseno_electrico                text,
  diseno_hidraulico               text,
  paisajismo                      text,
  plano_terminacion               text,
  presupuesto_terminacion         text,
  monto_presupuesto_terminacion   numeric(16, 2),
  created_at                      timestamptz NOT NULL DEFAULT now(),
  updated_at                      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT matriz_general_plantel_contrato_unique UNIQUE (contrato_id, plantel)
);

CREATE INDEX IF NOT EXISTS contrato_no_contrato_idx ON public.contrato (no_contrato);
CREATE INDEX IF NOT EXISTS contrato_lote_idx ON public.contrato (lote);
CREATE INDEX IF NOT EXISTS contrato_adenda_contrato_idx ON public.contrato_adenda (contrato_id);
CREATE INDEX IF NOT EXISTS adenda_contrato_idx ON public.adenda (contrato_id);
CREATE INDEX IF NOT EXISTS adenda_contrato_estado_idx ON public.adenda (contrato_id, estado);
CREATE INDEX IF NOT EXISTS matriz_general_contrato_idx ON public.matriz_general (contrato_id);
CREATE INDEX IF NOT EXISTS matriz_general_lote_idx ON public.matriz_general (lote);
CREATE INDEX IF NOT EXISTS matriz_general_obra_idx ON public.matriz_general (obra_id);
CREATE INDEX IF NOT EXISTS matriz_general_provincia_idx ON public.matriz_general (provincia);
CREATE INDEX IF NOT EXISTS matriz_general_estatus_idx ON public.matriz_general (estatus);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['contrato', 'contrato_adenda', 'adenda', 'matriz_general']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_updated_at', t);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.sepri_set_updated_at()',
      t || '_updated_at', t
    );
  END LOOP;
END $$;

CREATE OR REPLACE VIEW public.v_matriz_general_techado AS
SELECT
  mg.lote, c.contratista_nombre, c.no_contrato, c.fecha_contrato,
  mg.plantel, mg.provincia, mg.municipio, mg.reg_dist,
  c.presupuesto_centro AS presupuesto, mg.ejecucion_actual, mg.observaciones,
  mg.estatus, mg.porcentaje_ejecucion AS porcentaje,
  mg.porcentaje_ejecucion_alt AS ejec, mg.fecha_inauguracion,
  mg.anio_proceso AS fecha_proceso, c.cubicacion_enviada, c.libramiento,
  c.fecha_salida, c.estatus_contrato, c.proceso,
  c.observaciones AS observaciones_contrato, c.certificacion,
  ca.tipo_adenda, ca.monto_adendado, c.monto_total_inversion,
  mg.movimiento_tierra, mg.obs_movimiento_tierra, mg.obs_planos_arquitectonicos,
  mg.obs_diseno, mg.as_built, mg.diseno_arquitectonico, mg.diseno_estructural,
  mg.diseno_sanitario, mg.diseno_electrico, mg.diseno_hidraulico, mg.paisajismo,
  mg.plano_terminacion, mg.presupuesto_terminacion, mg.monto_presupuesto_terminacion,
  mg.monto_contratado_centro, c.monto_total_contrato, c.avance_20_porciento,
  mg.fecha_ultima_cubicacion, mg.estatus_ultima_cubicacion, mg.numero_ultima_cubicacion,
  mg.monto_ultima_cubicacion, mg.valor_cubicado_presupuesto_base, mg.adicional_cubicacion,
  mg.porcentaje_cubicado_centro, mg.monto_cubicado_centro, mg.monto_total_cubicado_sin_amort,
  mg.porciento_cubicado, mg.pendiente_a_cubicar, mg.monto_total_pagado, mg.monto_avance_centro,
  mg.id AS matriz_general_id, c.id AS contrato_id, mg.obra_id
FROM public.matriz_general mg
JOIN public.contrato c ON c.id = mg.contrato_id
LEFT JOIN LATERAL (
  SELECT a.tipo_adenda, a.monto_adendado
  FROM public.contrato_adenda a
  WHERE a.contrato_id = c.id
  ORDER BY a.orden DESC, a.created_at DESC
  LIMIT 1
) ca ON true;

-- =============================================================================
-- 7) DATOS SEMILLA (áreas + admin)
-- =============================================================================

SELECT public.sepri_seed_catalogos();

-- =============================================================================
-- 8) RPC — vinculación Techado ↔ obras
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sepri_normalizar_contrato(raw text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE s text; digits text;
BEGIN
  IF raw IS NULL OR trim(raw) = '' THEN RETURN ''; END IF;
  s := trim(raw);
  IF s ~ '^\d{4}-\d{4}$' THEN RETURN s; END IF;
  digits := regexp_replace(s, '\D', '', 'g');
  IF length(digits) >= 8 THEN
    RETURN substring(digits FROM 1 FOR 4) || '-' || substring(digits FROM 5 FOR 4);
  END IF;
  RETURN s;
END;
$$;

-- Enlazar obras.contrato_id desde catálogo Techado (contrato) usando obras.contrato legado
DO $$
DECLARE
  r RECORD;
  v_contrato_id text;
  v_norm text;
BEGIN
  IF to_regclass('public.contrato') IS NULL OR to_regclass('public.obras') IS NULL THEN
    RETURN;
  END IF;
  FOR r IN
    SELECT DISTINCT public.sepri_normalizar_contrato(o.contrato) AS nc
    FROM public.obras o
    WHERE o.contrato IS NOT NULL AND trim(o.contrato) <> ''
      AND public.sepri_normalizar_contrato(o.contrato) <> ''
  LOOP
    v_norm := r.nc;
    SELECT c.id INTO v_contrato_id FROM public.contrato c WHERE c.no_contrato = v_norm ORDER BY c.lote LIMIT 1;
    IF v_contrato_id IS NULL THEN
      INSERT INTO public.contrato (lote, no_contrato)
      VALUES (0, v_norm)
      ON CONFLICT (lote, no_contrato) DO UPDATE SET updated_at = now()
      RETURNING id INTO v_contrato_id;
    END IF;
    UPDATE public.obras o
    SET contrato_id = v_contrato_id, updated_at = now()
    WHERE public.sepri_normalizar_contrato(o.contrato) = v_norm
      AND (o.contrato_id IS DISTINCT FROM v_contrato_id);
  END LOOP;
END $$;

-- Backfill obras.tipo (requiere contrato_id ya creado en §6)
UPDATE public.obras
SET tipo = 'Arrastre'
WHERE (codigo IS NOT NULL AND trim(codigo) <> '')
   OR (distrito_minerd_sigede IS NOT NULL AND trim(distrito_minerd_sigede) <> '');

UPDATE public.obras
SET tipo = 'Mantenimiento'
WHERE tipo = 'Arrastre'
  AND (codigo IS NULL OR trim(codigo) = '')
  AND (distrito_minerd_sigede IS NULL OR trim(distrito_minerd_sigede) = '')
  AND (
    contrato_id IS NOT NULL
    OR (contrato IS NOT NULL AND trim(contrato) <> '')
  );

CREATE OR REPLACE FUNCTION public.sepri_normalizar_reg_dist(raw text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE s text; m text[];
BEGIN
  IF raw IS NULL OR trim(raw) = '' THEN RETURN ''; END IF;
  s := regexp_replace(trim(raw), '\s+', '', 'g');
  m := regexp_match(s, '^(\d{1,2})-(\d{1,2})$');
  IF m IS NOT NULL THEN
    RETURN lpad(m[1], 2, '0') || '-' || lpad(m[2], 2, '0');
  END IF;
  RETURN s;
END;
$$;

CREATE OR REPLACE FUNCTION public.sepri_normalizar_texto_clave(raw text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT upper(trim(regexp_replace(coalesce(raw, ''), '\s+', ' ', 'g')));
$$;

CREATE OR REPLACE FUNCTION public.sepri_puntaje_nombre_plantel(plantel text, nombre_obra text)
RETURNS integer LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE p text; n text; w text; coinciden integer := 0; total integer := 0;
BEGIN
  p := public.sepri_normalizar_texto_clave(plantel);
  n := public.sepri_normalizar_texto_clave(nombre_obra);
  IF p = '' OR n = '' THEN RETURN 0; END IF;
  IF p = n THEN RETURN 100; END IF;
  IF position(p IN n) > 0 OR position(n IN p) > 0 THEN RETURN 80; END IF;
  FOREACH w IN ARRAY regexp_split_to_array(p, '\s+') LOOP
    IF length(w) > 3 THEN
      total := total + 1;
      IF position(w IN n) > 0 THEN coinciden := coinciden + 1; END IF;
    END IF;
  END LOOP;
  IF total = 0 THEN RETURN 0; END IF;
  RETURN (coinciden * 60) / total;
END;
$$;

CREATE OR REPLACE FUNCTION public.buscar_obra_para_matriz(
  p_no_contrato text DEFAULT '',
  p_reg_dist text DEFAULT '',
  p_plantel text DEFAULT '',
  p_provincia text DEFAULT NULL,
  p_municipio text DEFAULT NULL
)
RETURNS text LANGUAGE sql STABLE AS $$
  WITH params AS (
    SELECT
      public.sepri_normalizar_contrato(p_no_contrato) AS v_contrato,
      public.sepri_normalizar_reg_dist(p_reg_dist) AS v_reg,
      trim(coalesce(p_plantel, '')) AS v_plantel,
      public.sepri_normalizar_texto_clave(p_provincia) AS v_prov,
      public.sepri_normalizar_texto_clave(p_municipio) AS v_mun
  ),
  gate AS (SELECT * FROM params WHERE v_contrato <> '' OR v_reg <> '' OR v_plantel <> ''),
  candidatos AS (
    SELECT o.id, o.contrato, o.distrito_minerd_sigede, o.nombre, o.provincia, o.municipio
    FROM public.obras o CROSS JOIN gate p
    WHERE (p.v_contrato <> '' AND public.sepri_normalizar_contrato(o.contrato) = p.v_contrato)
       OR (p.v_reg <> '' AND public.sepri_normalizar_reg_dist(o.distrito_minerd_sigede) = p.v_reg)
       OR (p.v_plantel <> '' AND public.sepri_normalizar_texto_clave(o.nombre)
           LIKE '%' || public.sepri_normalizar_texto_clave(p.v_plantel) || '%')
  ),
  scored AS (
    SELECT c.id,
      (
        CASE WHEN p.v_contrato <> '' AND public.sepri_normalizar_contrato(c.contrato) = p.v_contrato THEN 40 ELSE 0 END
        + CASE WHEN p.v_reg <> '' AND public.sepri_normalizar_reg_dist(c.distrito_minerd_sigede) = p.v_reg THEN 45 ELSE 0 END
        + CASE WHEN p.v_contrato <> '' AND public.sepri_normalizar_contrato(c.contrato) = p.v_contrato
                AND p.v_reg <> '' AND public.sepri_normalizar_reg_dist(c.distrito_minerd_sigede) = p.v_reg THEN 25 ELSE 0 END
        + public.sepri_puntaje_nombre_plantel(p.v_plantel, c.nombre)
        + CASE WHEN p.v_prov <> '' AND public.sepri_normalizar_texto_clave(c.provincia) = p.v_prov THEN 5 ELSE 0 END
        + CASE WHEN p.v_mun <> '' AND public.sepri_normalizar_texto_clave(c.municipio) = p.v_mun THEN 5 ELSE 0 END
      )::integer AS score
    FROM candidatos c CROSS JOIN gate p
  ),
  ranked AS (
    SELECT id, score,
      row_number() OVER (ORDER BY score DESC, id) AS rn,
      count(*) OVER (PARTITION BY score) AS tie_at_score
    FROM scored WHERE score >= 50
  )
  SELECT r.id FROM ranked r
  WHERE r.rn = 1 AND NOT (r.tie_at_score > 1 AND r.score < 90)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.buscar_obra_para_matriz(text, text, text, text, text)
  TO anon, authenticated;

-- =============================================================================
-- 9) ÍNDICES DE OPTIMIZACIÓN
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_obras_contratista_id ON public.obras (contratista_id);
CREATE INDEX IF NOT EXISTS idx_obras_contrato_id
  ON public.obras (contrato_id) WHERE contrato_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_obras_contrato
  ON public.obras (contrato) WHERE contrato IS NOT NULL AND trim(contrato) <> '';
CREATE INDEX IF NOT EXISTS idx_obras_distrito_minerd_sigede
  ON public.obras (distrito_minerd_sigede)
  WHERE distrito_minerd_sigede IS NOT NULL AND trim(distrito_minerd_sigede) <> '';
CREATE INDEX IF NOT EXISTS idx_obras_estado ON public.obras (estado);
CREATE INDEX IF NOT EXISTS idx_obras_tipo_obra
  ON public.obras (tipo_obra) WHERE tipo_obra IS NOT NULL AND trim(tipo_obra) <> '';
CREATE INDEX IF NOT EXISTS idx_obras_codigo_lower
  ON public.obras (lower(trim(codigo))) WHERE codigo IS NOT NULL AND trim(codigo) <> '';
CREATE INDEX IF NOT EXISTS idx_obras_codigo_trgm ON public.obras USING gin (codigo gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_obras_nombre_trgm ON public.obras USING gin (nombre gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_obras_contrato_trgm ON public.obras USING gin (contrato gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_obras_contrato_reg_dist
  ON public.obras (contrato, distrito_minerd_sigede)
  WHERE contrato IS NOT NULL AND distrito_minerd_sigede IS NOT NULL;

-- Unicidad: código SIGEDE (mayúsculas) y obras de mantenimiento por contrato + nombre
UPDATE public.obras
SET codigo = upper(trim(codigo))
WHERE codigo IS NOT NULL
  AND trim(codigo) <> ''
  AND codigo IS DISTINCT FROM upper(trim(codigo));

WITH duplicados AS (
  SELECT o.id
  FROM public.obras o
  INNER JOIN (
    SELECT codigo, min(id) AS keep_id
    FROM public.obras
    WHERE codigo IS NOT NULL AND trim(codigo) <> ''
    GROUP BY codigo
    HAVING count(*) > 1
  ) d ON d.codigo = o.codigo AND o.id <> d.keep_id
)
DELETE FROM public.obras WHERE id IN (SELECT id FROM duplicados);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND n.nspname = 'public'
      AND c.relname = 'idx_obras_codigo_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_obras_codigo_unique
      ON public.obras (codigo)
      WHERE codigo IS NOT NULL AND trim(codigo) <> '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND n.nspname = 'public'
      AND c.relname = 'idx_obras_mantenimiento_contrato_nombre'
  ) THEN
    CREATE UNIQUE INDEX idx_obras_mantenimiento_contrato_nombre
      ON public.obras (contrato_id, lower(trim(nombre)))
      WHERE tipo = 'Mantenimiento'
        AND contrato_id IS NOT NULL
        AND trim(nombre) <> '';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tramites_id_sigede_gin ON public.tramites USING gin (id_sigede);
CREATE INDEX IF NOT EXISTS idx_tramites_obra_ids_gin ON public.tramites USING gin (obra_ids);
CREATE INDEX IF NOT EXISTS idx_doc_tecnicos_id_sigede_gin
  ON public.documentos_tecnicos_obra USING gin (id_sigede);
CREATE INDEX IF NOT EXISTS idx_doc_tecnicos_obra_ids_gin
  ON public.documentos_tecnicos_obra USING gin (obra_ids);
CREATE INDEX IF NOT EXISTS idx_obras_tipo
  ON public.obras (tipo);
CREATE INDEX IF NOT EXISTS idx_matriz_reg_dist_contrato
  ON public.matriz_general (reg_dist, contrato_id)
  WHERE reg_dist IS NOT NULL AND trim(reg_dist) <> '';
CREATE INDEX IF NOT EXISTS idx_matriz_sin_obra
  ON public.matriz_general (contrato_id) WHERE obra_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_matriz_plantel_trgm
  ON public.matriz_general USING gin (plantel gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_historial_estados_codigo
  ON public.historial_estados (codigo) WHERE codigo IS NOT NULL;

-- =============================================================================
-- 10) RLS — políticas para clave anon (app sin Supabase Auth)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sepri_rls_anon_all(p_table text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE pol record;
BEGIN
  IF to_regclass('public.' || p_table) IS NULL THEN
    RAISE NOTICE 'Tabla public.% no existe — omitida', p_table;
    RETURN;
  END IF;
  EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated', p_table);
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = p_table
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, p_table);
  END LOOP;
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', p_table);
  EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO anon USING (true)', p_table || '_anon_select', p_table);
  EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO anon WITH CHECK (true)', p_table || '_anon_insert', p_table);
  EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO anon USING (true) WITH CHECK (true)', p_table || '_anon_update', p_table);
  EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO anon USING (true)', p_table || '_anon_delete', p_table);
  EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)', p_table || '_auth_all', p_table);
  RAISE NOTICE 'RLS anon configurado en public.%', p_table;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'obras', 'tramites', 'movimientos_tramites', 'historial_uploads',
    'usuarios_app', 'area', 'contratistas', 'historial_estados',
    'tiempo_en_area', 'notificaciones_tiempo', 'notificacion_leida',
    'documentos_tecnicos_obra', 'movimiento_documentos_tecnicos_obra',
    'contrato', 'contrato_adenda', 'adenda', 'documento_tecnico_comentario', 'matriz_general',
    'contratista_access_tokens', 'formulario_contratista',
    'movimientos_solicitud_contratista'
  ]
  LOOP
    PERFORM public.sepri_rls_anon_all(t);
  END LOOP;
END $$;

CREATE POLICY "fc_select_authenticated" ON public.formulario_contratista FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.usuarios_app u
    WHERE (u.id)::text = (SELECT auth.uid()::text) AND COALESCE(u.activo, true) = true
      AND (lower(trim(u.rol)) IN ('admin', 'supervision')
        OR (formulario_contratista.area_actual IS NOT NULL AND formulario_contratista.area_actual = u.area))
  ));
CREATE POLICY "fc_insert_authenticated" ON public.formulario_contratista FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.usuarios_app u
    WHERE (u.id)::text = (SELECT auth.uid()::text) AND COALESCE(u.activo, true) = true
  ));
CREATE POLICY "fc_update_authenticated" ON public.formulario_contratista FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.usuarios_app u
    WHERE (u.id)::text = (SELECT auth.uid()::text) AND COALESCE(u.activo, true) = true
      AND (lower(trim(u.rol)) IN ('admin', 'supervision')
        OR (formulario_contratista.area_actual IS NOT NULL AND formulario_contratista.area_actual = u.area)
        OR (formulario_contratista.estado = 'pendiente_asignacion' AND lower(trim(u.rol)) IN ('admin', 'supervision')))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.usuarios_app u
    WHERE (u.id)::text = (SELECT auth.uid()::text) AND COALESCE(u.activo, true) = true
  ));
CREATE POLICY "mov_select_authenticated" ON public.movimientos_solicitud_contratista FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.formulario_contratista f
    JOIN public.usuarios_app u ON (u.id)::text = (SELECT auth.uid()::text)
    WHERE f.id = movimientos_solicitud_contratista.solicitud_id AND COALESCE(u.activo, true) = true
      AND (lower(trim(u.rol)) IN ('admin', 'supervision')
        OR (f.area_actual IS NOT NULL AND f.area_actual = u.area))
  ));
CREATE POLICY "mov_insert_authenticated" ON public.movimientos_solicitud_contratista FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.formulario_contratista f
    JOIN public.usuarios_app u ON (u.id)::text = (SELECT auth.uid()::text)
    WHERE f.id = movimientos_solicitud_contratista.solicitud_id AND COALESCE(u.activo, true) = true
      AND (lower(trim(u.rol)) IN ('admin', 'supervision')
        OR (f.area_actual IS NOT NULL AND f.area_actual = u.area)
        OR (f.estado = 'pendiente_asignacion' AND lower(trim(u.rol)) IN ('admin', 'supervision')))
  ));

DROP FUNCTION public.sepri_rls_anon_all(text);

-- =============================================================================
-- 11) STORAGE — bucket documentos
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('documentos', 'documentos', true, 52428800, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = true, file_size_limit = 52428800, allowed_mime_types = NULL;

DROP POLICY IF EXISTS "documentos_anon_insert" ON storage.objects;
DROP POLICY IF EXISTS "documentos_anon_select" ON storage.objects;
DROP POLICY IF EXISTS "documentos_anon_update" ON storage.objects;
DROP POLICY IF EXISTS "documentos_anon_delete" ON storage.objects;
DROP POLICY IF EXISTS "documentos_public_all" ON storage.objects;
DROP POLICY IF EXISTS "documentos_public_read" ON storage.objects;
DROP POLICY IF EXISTS "documentos_public_insert" ON storage.objects;

CREATE POLICY "documentos_public_all" ON storage.objects FOR ALL TO public
  USING (bucket_id = 'documentos') WITH CHECK (bucket_id = 'documentos');

-- =============================================================================
-- 12) REALTIME (opcional)
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.tramites;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.movimientos_tramites;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

-- Verificación rápida
SELECT id, usuario, rol, activo FROM public.usuarios_app WHERE lower(trim(usuario)) = 'admin';
