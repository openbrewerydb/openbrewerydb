CREATE SCHEMA IF NOT EXISTS guilds;
CREATE TABLE IF NOT EXISTS guilds.guilds_{{date}} (
    id UUID PRIMARY KEY,
    scope character varying NOT NULL,
    country_code character varying NOT NULL,
    country character varying NOT NULL,
    subdivision_code character varying,
    subdivision character varying,
    organization character varying NOT NULL,
    website character varying,
    CONSTRAINT guilds_{{date}}_scope_check CHECK (scope IN ('national', 'subdivision', 'regional')),
    CONSTRAINT guilds_{{date}}_country_code_check CHECK (country_code ~ '^[A-Z]{2}$'),
    CONSTRAINT guilds_{{date}}_required_text_check CHECK (
        btrim(country) <> '' AND btrim(organization) <> ''
    ),
    CONSTRAINT guilds_{{date}}_subdivision_check CHECK (
        (scope = 'national' AND subdivision_code IS NULL AND subdivision IS NULL)
        OR (
            scope <> 'national'
            AND subdivision_code ~ '^[A-Z0-9]{1,3}$'
            AND subdivision IS NOT NULL
            AND btrim(subdivision) <> ''
        )
    )
);
CREATE INDEX IF NOT EXISTS guilds_{{date}}_country_idx
    ON guilds.guilds_{{date}} (country_code, subdivision_code);
