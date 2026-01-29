const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const validRegistration = (data) => {
  const errors = []; 

  if (!data.email || !isValidEmail(data.email)) {
    errors.push("Invalid email address"); 
  }
  
  if (!data.password || data.password.length < 6) {
    errors.push("Password must be at least 6 characters long");
  }
  
  if (!data.name || data.name.trim().length < 1) {
    errors.push("Name cannot be empty");
  }
  
  if (!data.phone) {
    errors.push("Phone number is required");
  }

  return errors;
};

export default validRegistration;