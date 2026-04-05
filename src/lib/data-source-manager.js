/**
 * Web edition – PostgreSQL (Prisma) only.
 * External data sources (Entra, Firebase, SQL Server, SharePoint) are disabled.
 */

export const LAYERS = { USERS: "users", CARS: "cars", RESERVATIONS: "reservations" };
export const PROVIDERS = { LOCAL: "LOCAL", ENTRA: "ENTRA", SQL_SERVER: "SQL_SERVER", FIREBASE: "FIREBASE", SHAREPOINT: "SHAREPOINT" };

const DEFAULT_CONFIG = { [LAYERS.USERS]: PROVIDERS.LOCAL, [LAYERS.CARS]: PROVIDERS.LOCAL, [LAYERS.RESERVATIONS]: PROVIDERS.LOCAL };

const DEFAULT_CONFIG_FULL = {
  ...DEFAULT_CONFIG,
  usersTable: null,
  carsTable: null,
  reservationsTable: null,
};

const TABLE_KEYS = { [LAYERS.USERS]: "usersTable", [LAYERS.CARS]: "carsTable", [LAYERS.RESERVATIONS]: "reservationsTable" };

export async function getDataSourceConfig(_companyId) {
  return { ...DEFAULT_CONFIG_FULL };
}

export async function getProvider(companyId, layer) {
  const config = await getDataSourceConfig(companyId);
  return config[layer] ?? PROVIDERS.LOCAL;
}

export async function getLayerTable(companyId, layer) {
  const config = await getDataSourceConfig(companyId);
  const key = TABLE_KEYS[layer];
  return key ? (config[key] ?? null) : null;
}

export async function saveDataSourceConfig(_companyId, _config) {
  throw new Error("Data source configuration is not available in the web edition (PostgreSQL only).");
}

export async function getStoredCredentials(_companyId, _layer, _provider) {
  return null;
}

export async function saveStoredCredentials(_companyId, _layer, _provider, _payload) {
  throw new Error("External data source credentials are not supported in the web edition (PostgreSQL only).");
}
