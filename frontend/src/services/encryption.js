import nacl from 'tweetnacl'
import utils from 'tweetnacl-util'

/**
 * E2EE Encryption Service
 * Uses NaCl (libsodium) for client-side encryption
 */

export const encryptionService = {
  /**
   * Generate a keypair for the user
   */
  generateKeyPair: () => {
    return nacl.box.keyPair()
  },

  /**
   * Encrypt a message for a recipient
   */
  encryptMessage: (message, recipientPublicKey, senderSecretKey) => {
    const nonce = nacl.randomBytes(24)
    const messageBytes = utils.decodeUTF8(message)
    const recipientKeyUint8Array = utils.decodeBase64(recipientPublicKey)
    const secretKeyUint8Array = utils.decodeBase64(senderSecretKey)

    const encrypted = nacl.box(
      messageBytes,
      nonce,
      recipientKeyUint8Array,
      secretKeyUint8Array
    )

    const fullMessage = new Uint8Array(nonce.length + encrypted.length)
    fullMessage.set(nonce)
    fullMessage.set(encrypted, nonce.length)

    return utils.encodeBase64(fullMessage)
  },

  /**
   * Decrypt a message
   */
  decryptMessage: (encryptedMessage, senderPublicKey, recipientSecretKey) => {
    const encryptedBytes = utils.decodeBase64(encryptedMessage)
    const nonce = encryptedBytes.slice(0, 24)
    const message = encryptedBytes.slice(24)
    const senderKeyUint8Array = utils.decodeBase64(senderPublicKey)
    const secretKeyUint8Array = utils.decodeBase64(recipientSecretKey)

    const decrypted = nacl.box.open(
      message,
      nonce,
      senderKeyUint8Array,
      secretKeyUint8Array
    )

    if (!decrypted) {
      throw new Error('Failed to decrypt message')
    }

    return utils.encodeUTF8(decrypted)
  },

  /**
   * Get public key from keypair
   */
  getPublicKey: (keypair) => {
    return utils.encodeBase64(keypair.publicKey)
  },

  /**
   * Get secret key from keypair
   */
  getSecretKey: (keypair) => {
    return utils.encodeBase64(keypair.secretKey)
  }
}
