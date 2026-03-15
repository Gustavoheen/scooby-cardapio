// Certificado exclusivo da Scooby-Doo Lanches para autenticação com QZ Tray
// O certificado.pem correspondente deve estar em:
// C:\Users\[usuario]\AppData\Roaming\qz\certs\scooby.pem
// A chave privada fica segura no Vercel (variável de ambiente QZ_PRIVATE_KEY)

export const CERTIFICATE = `-----BEGIN CERTIFICATE-----
MIIDFzCCAf+gAwIBAgIUT3L8PfsMlhAqsB0dgO123pwwetwwDQYJKoZIhvcNAQEL
BQAwGzEZMBcGA1UEAwwQU2Nvb2J5RG9vTGFuY2hlczAeFw0yNjAzMTUyMjA0MDla
Fw0zNjAzMTIyMjA0MDlaMBsxGTAXBgNVBAMMEFNjb29ieURvb0xhbmNoZXMwggEi
MA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQC5TTzuSBDx5bbGH3iLX8kD+tHc
n0gQ0y/noq40TAb/REFIPsUBSdBxMeLT+x/xJRLyGEL45iyMXf7BvVvN9GVRCw1Z
EqiwEA1XYncDMENy8LxPOKStB4kt6axR2l1BzSe+zRo2nPNqk653Rhe5ZT2fd6yx
+eS1bwDYSF6egHqEnyX5dCyWJ/Bs6CneMneWkjdbIopJpolon+wsvIx2D8xpFCaR
rg/5zq90p8YMXGzMCUg70c1kKefYlarBY1Cdopylv3jSHzHDLbk9zBelrfhFr9aO
XN5XUGKdtgI6/hxBP5VZmC2h5Ps29Vgk26FXSuOfiP80MorHBVqsIl9/isbdAgMB
AAGjUzBRMB0GA1UdDgQWBBQlS+4oCfuoSxff13SABHv369P7OjAfBgNVHSMEGDAW
gBQlS+4oCfuoSxff13SABHv369P7OjAPBgNVHRMBAf8EBTADAQH/MA0GCSqGSIb3
DQEBCwUAA4IBAQBl2Ne9QoCLY3BHxAaRPjl5hezIjhNuj4he2Nn4cWFBLH7TIVQd
/yepNYqnNGfLMMp5PnSrM1HH7DiYZE2bmKuJv+l6fOmR373P8nlfRa/egOA0A+xX
yfM3NsJh8nIiAHdFu0GJx5X5qMslxpAbAx5AsZDbqsg5rMTbHAiNTVEUAXy89UVn
SiYWBwzdLKd1SLnmxcv3i2OnnC1vT+VNoT3p6zfTw0mL1lkQDPYmBCFdSFF2gRd8
Gyw5zCKUTuNGKUF7PokxBN5P4XSYUkZ+CQ7LjXYsOSBI5/rdeAOyBJgo8y2vTh6/
Q8wuIfiyvdE4xbR6yQw3MpxmwkrtsVTo3aBB
-----END CERTIFICATE-----`

export async function assinarQZ(toSign) {
  const resp = await fetch(`/api/qz-sign?toSign=${encodeURIComponent(toSign)}`)
  if (!resp.ok) throw new Error('Erro ao assinar: ' + resp.status)
  return resp.text()
}
