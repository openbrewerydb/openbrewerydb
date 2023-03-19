CREATE SCHEMA IF NOT EXISTS breweries;
CREATE TABLE IF NOT EXISTS breweries.breweries_{{date}} (
    id UUID PRIMARY KEY,
    name character varying NOT NULL,
    brewery_type character varying NOT NULL,
    address_1 character varying,
    address_2 character varying,
    address_3 character varying,
    city character varying NOT NULL,
    state_province character varying NOT NULL,
    postal_code character varying NOT NULL,
    country character varying NOT NULL,
    website_url character varying,
    phone character varying,
    longitude numeric,
    latitude numeric
);
CREATE UNIQUE INDEX IF NOT EXISTS breweries_id_idx ON breweries.breweries_{{date}} (id);
