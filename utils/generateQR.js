const QRCode = require('qrcode');

async function generateQRCode(employeeId) {
  const url = `http://localhost:3000/public-employee/${employeeId}`;
  const qrImage = await QRCode.toDataURL(url);
  return qrImage;
}

module.exports = generateQRCode;