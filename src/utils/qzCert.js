// Certificado exclusivo da Scooby-Doo Lanches para autenticação com QZ Tray
// O certificado.pem correspondente deve estar em:
// C:\Users\[usuario]\AppData\Roaming\qz\certs\scooby.pem

const CERTIFICATE = `-----BEGIN CERTIFICATE-----
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

const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC5TTzuSBDx5bbG
H3iLX8kD+tHcn0gQ0y/noq40TAb/REFIPsUBSdBxMeLT+x/xJRLyGEL45iyMXf7B
vVvN9GVRCw1ZEqiwEA1XYncDMENy8LxPOKStB4kt6axR2l1BzSe+zRo2nPNqk653
Rhe5ZT2fd6yx+eS1bwDYSF6egHqEnyX5dCyWJ/Bs6CneMneWkjdbIopJpolon+ws
vIx2D8xpFCaRrg/5zq90p8YMXGzMCUg70c1kKefYlarBY1Cdopylv3jSHzHDLbk9
zBelrfhFr9aOXN5XUGKdtgI6/hxBP5VZmC2h5Ps29Vgk26FXSuOfiP80MorHBVqs
Il9/isbdAgMBAAECggEASuOO4QRqKME8nZTBfJ6RGJUpdL9A+l/HqBeEzSj+2PLG
aYLIzuz8m4rcT+zZq3Ve003/3yTzUyV33OgBLtr7iYXsdpfGaiWKpsrqK3U5hT4K
9P+A+lcl11LtrEUS1JGr4v50fibvb57Q7256Dxj+DzFoL6O9jaAXmNGiv+9P1MHm
4GduyRP/O+RSuPPRa9JZg4Ll7hqY7Nw/azBwOifwjGFq5MF0c7BBiuFpptKG+jGE
ugA/zZu75sbNlUMI5kSXDbGUf6Cpz9rAoFhmyGc8rOGKU3kA8Or0hFO+c4OuVCiW
j6neq6aIBUMGJcBwXLwMr77Hjv5g3BJ4yLqzpoha5wKBgQDmDaH9RIpc5CdTMaBS
5e/qly8210i0/mSpHhEYPVu7SJPvgKi99+x3U9+ioVYMb566MiQge4rqv/jxUjLR
bnlZsWytelEkNzEpsplD1I0F/qZK91vLn7lSDEPvm37DbNSObyIXZ+W9D2xi5E/U
cp13pyM6ZQTXjq6/JH/lpXyLEwKBgQDOM3x7FIX0xKiDxavYNkEQTjQtBba539yC
ouI5JXGTyz0ccRXu2EXFBc0xaARrzrLkBmR3rawJZmRJAcWy0XOLwqbyvxT3wtTp
8T6ZN9PA8xFhv6c8Jy6Ms6OPrM9kRmgXarwoMvB97Fqapto7sdHIi+oeHm4E7Rmz
+ewS1jQ0TwKBgFPeHHQMjLSYqI13xg7yrKhFPX0stuDk7SWKRIkltU9tgiEKMnou
7BIEjb7oOkqGVsNijDEbWOWD3ul7IfOf5rWALTKBKRue01l0NtO3pUHOOCmUS+7L
5++1cP7lHS15e3QBp9gIlIR8HvNecIvuzOFWGU2sjjtXVPVyBP5feivpAoGBAIca
fOk33T0uzSrpjVqw0ZiZZN5K7BqFbrm5d3fx7KTleTj1b2V7FtusnXFNsffhCp0V
AybXB+1wxSyAmMQ9L/PWqgRK5rYfVdmiU12YkonNuQnOxQhIs9tEqFou5APTjcgq
CvZbye73ubWytTJ/o/A+nDr3vSZFI54klmURLEtJAoGBAIpWlOAoY6DCeoRPdqMV
MlbASRw8zbOdZcAFC+CbDuiBSjp/EhJEKsOA+OOw+cXdGylZCMAyMFCIvU34wk/+
0B2QnOEfpTUglSNv+9fuXU+FtTtj04U9BQbmwyRQva3FjFTp//zhbfbXy8MJLTjc
zSuz6ASCQjEPxhpT8rbqqHUC
-----END PRIVATE KEY-----`

export { CERTIFICATE }

export async function assinarQZ(toSign) {
  const pem = PRIVATE_KEY
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '')
  const keyBuffer = Uint8Array.from(atob(pem), c => c.charCodeAt(0))
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: { name: 'SHA-512' } },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    cryptoKey,
    new TextEncoder().encode(toSign)
  )
  return btoa(String.fromCharCode(...new Uint8Array(signature)))
}
