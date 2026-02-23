/**
 * Application Logger Module
 * Centralized logging using Winston
 */
import winston from 'winston'

const { combine, timestamp, printf, colorize, errors } = winston.format

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let log = `${timestamp} [${level}]: ${message}`
  if (Object.keys(meta).length > 0) {
    log += ` ${JSON.stringify(meta)}`
  }
  if (stack) {
    log += `\n${stack}`
  }
  return log
})

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: combine(
        colorize(),
        logFormat
      )
    })
  ],
  // Don't exit on error
  exitOnError: false
})

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({
    filename: '/var/log/kfdc-ifms/error.log',
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }))
  logger.add(new winston.transports.File({
    filename: '/var/log/kfdc-ifms/combined.log',
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }))
}

/**
 * Log API request
 * @param {string} method - HTTP method
 * @param {string} path - Request path
 * @param {string} userId - User ID (if authenticated)
 */
export function logRequest(method, path, userId = null) {
  logger.info(`API Request: ${method} ${path}`, { userId })
}

/**
 * Log API response
 * @param {string} method - HTTP method
 * @param {string} path - Request path
 * @param {number} statusCode - Response status code
 * @param {number} duration - Request duration in ms
 */
export function logResponse(method, path, statusCode, duration) {
  const level = statusCode >= 400 ? 'warn' : 'info'
  logger[level](`API Response: ${method} ${path} - ${statusCode}`, { duration: `${duration}ms` })
}

/**
 * Log error with context
 * @param {Error} error - Error object
 * @param {object} context - Additional context
 */
export function logError(error, context = {}) {
  logger.error(error.message, { ...context, stack: error.stack })
}

/**
 * Log database operation
 * @param {string} operation - Operation name
 * @param {string} collection - Collection name
 * @param {object} details - Additional details
 */
export function logDbOperation(operation, collection, details = {}) {
  logger.debug(`DB ${operation}: ${collection}`, details)
}

export default logger
