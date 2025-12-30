const winston = require("winston");

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define colors for each level
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

// Add colors to winston
winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) =>
      `${info.timestamp} ${info.level}: ${info.message}${
        info.stack ? "\n" + info.stack : ""
      }${
        info.error || info.ip || info.userAgent
          ? "\n" +
            JSON.stringify(
              {
                error: info.error,
                ip: info.ip,
                userAgent: info.userAgent,
                url: info.url,
                method: info.method,
              },
              null,
              2
            )
          : ""
      }`
  )
);

// Define transports
const transports = [
  // Console transport for development
  new winston.transports.Console({
    level: process.env.LOG_LEVEL || "info",
    format: format,
  }),
];

// Add file transport for production
if (process.env.NODE_ENV === "production") {
  transports.push(
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),
    new winston.transports.File({
      filename: "logs/combined.log",
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    })
  );
}

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  levels,
  format: winston.format.json(),
  transports,
  exitOnError: false,
});

module.exports = logger;
