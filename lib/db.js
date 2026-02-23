/**
 * Database Connection Module
 * Centralized MongoDB connection management
 */
import { MongoClient } from 'mongodb'

let client = null
let db = null

/**
 * Connect to MongoDB and return database instance
 * Uses connection pooling for efficiency
 */
export async function connectToMongo() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME)
  }
  return db
}

/**
 * Get the current database instance
 * @returns {Db} MongoDB database instance
 */
export function getDb() {
  return db
}

/**
 * Close the MongoDB connection
 */
export async function closeConnection() {
  if (client) {
    await client.close()
    client = null
    db = null
  }
}

export default { connectToMongo, getDb, closeConnection }
