import * as ExpoCrypto from 'expo-crypto';

type GlobalWithCrypto = typeof globalThis & { crypto?: Crypto };

const g = globalThis as GlobalWithCrypto;

if (!g.crypto) {
  g.crypto = {} as Crypto;
}

const cryptoRef = g.crypto;

function mapAlgorithm(algorithm: AlgorithmIdentifier): ExpoCrypto.CryptoDigestAlgorithm {
  const name = typeof algorithm === 'string' ? algorithm : algorithm.name;
  switch (name) {
    case 'SHA-256':
      return ExpoCrypto.CryptoDigestAlgorithm.SHA256;
    case 'SHA-384':
      return ExpoCrypto.CryptoDigestAlgorithm.SHA384;
    case 'SHA-512':
      return ExpoCrypto.CryptoDigestAlgorithm.SHA512;
    default:
      throw new DOMException(`Algorithm not supported: ${name}`, 'NotSupportedError');
  }
}

async function digestPolyfill(algorithm: AlgorithmIdentifier, data: BufferSource): Promise<ArrayBuffer> {
  return ExpoCrypto.digest(mapAlgorithm(algorithm), data);
}

if (!cryptoRef.subtle?.digest) {
  Object.defineProperty(cryptoRef, 'subtle', {
    configurable: true,
    enumerable: true,
    writable: true,
    value: Object.assign({}, cryptoRef.subtle as object | undefined, { digest: digestPolyfill }),
  });
}
