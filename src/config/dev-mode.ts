export const DEV_CONFIG = {
  // Allow explicitly forcing "dev-like" timing + mock behaviors in a non-prod deployment
  // (for example a shared demo environment). Keep this opt-in so production remains stable.
  FORCED: process.env.DEV_MODE === "true",
  DEV_MODE: process.env.NODE_ENV !== "production" || process.env.DEV_MODE === "true",
  TIME_SCALE: process.env.DEV_TIME_SCALE ? parseInt(process.env.DEV_TIME_SCALE) : 360,
  MOCK_LLM: process.env.DEV_MOCK_LLM !== "false",
  SEED_ON_START: process.env.DEV_SEED !== "false",
  VERBOSE: process.env.DEV_VERBOSE === "true"
};
