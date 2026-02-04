export const DEV_CONFIG = {
  DEV_MODE: process.env.NODE_ENV !== "production",
  TIME_SCALE: process.env.DEV_TIME_SCALE ? parseInt(process.env.DEV_TIME_SCALE) : 360,
  MOCK_LLM: process.env.DEV_MOCK_LLM !== "false",
  SEED_ON_START: process.env.DEV_SEED !== "false",
  VERBOSE: process.env.DEV_VERBOSE === "true"
};

