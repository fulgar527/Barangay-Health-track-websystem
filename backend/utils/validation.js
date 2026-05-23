
function isValidContactNumber(number) {
  return /^09\d{9}$/.test(number);
}

function isMinor(age) {
  return age < 18;
}

function validateAppointment(dateObj) {
  const day = dateObj.getDay();
  const hours = dateObj.getHours();

  // Closed Saturday(6) and Sunday(0)
  if (day === 0 || day === 6) {
    return {
      valid: false,
      message: 'Appointments are available only Monday to Friday.'
    };
  }

  if (hours < 8 || hours >= 17) {
    return {
      valid: false,
      message: 'Appointments allowed only from 8AM to 5PM.'
    };
  }

  return { valid: true };
}

module.exports = {
  isValidContactNumber,
  isMinor,
  validateAppointment
};
