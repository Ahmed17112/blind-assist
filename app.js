// JavaScript to handle page transitions, form submissions, etc.
let users = JSON.parse(localStorage.getItem('users')) || [];
let currentUser = null;

// Handling login
document.getElementById('loginButton')?.addEventListener('click', function() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const user = users.find(u => u.email === email && u.password === password);

  const loginError = document.getElementById('loginError');
  loginError.style.display = 'none'; // Hide error message by default

  if (email === "" || password === "") {
    loginError.textContent = "Please enter both email and password.";
    loginError.style.display = 'block';
    return;
  }

  if (user) {
    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    window.location.href = 'home.html'; // Redirect to home page
  } else {
    loginError.textContent = 'Invalid credentials! Please check your email or password.';
    loginError.style.display = 'block';
  }
});

// Handling registration
document.getElementById('registerButton')?.addEventListener('click', function() {
  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value.trim();
  const confirmPassword = document.getElementById('registerConfirmPassword').value.trim();
  const registerError = document.getElementById('registerError');
  registerError.style.display = 'none';  // Hide error message by default

  // Check if the fields are filled
  if (email === "" || password === "" || confirmPassword === "") {
    registerError.textContent = "Please fill in all fields.";
    registerError.style.display = 'block';
    return;
  }

  // Check if passwords match
  if (password !== confirmPassword) {
    registerError.textContent = "Passwords do not match!";
    registerError.style.display = 'block';
    return;
  }

  // Check if the user already exists
  if (users.find(u => u.email === email)) {
    registerError.textContent = "User with this email already exists!";
    registerError.style.display = 'block';
    return;
  }

  // Add new user to localStorage
  users.push({ email, password, blindPeople: [] });
  localStorage.setItem('users', JSON.stringify(users));
  alert('Registration successful!');
  window.location.href = 'index.html'; // Redirect to login page
});

// Handling forgot password
document.getElementById('forgotButton')?.addEventListener('click', function() {
  const email = document.getElementById('forgotEmail').value.trim();
  const forgotMessage = document.getElementById('forgotMessage');
  const forgotError = document.getElementById('forgotError');

  forgotMessage.style.display = 'none'; // Hide success message by default
  forgotError.style.display = 'none';   // Hide error message by default

  // Check if the email field is empty
  if (email === "") {
    forgotError.textContent = "Please enter your email.";
    forgotError.style.display = 'block';
    return;
  }

  // Find user in localStorage
  const user = users.find(u => u.email === email);

  if (user) {
    // Display success message
    forgotMessage.textContent = "Password reset instructions have been sent to your email!";
    forgotMessage.style.display = 'block';
  } else {
    // Display error message
    forgotError.textContent = "Email not found! Please check your email address.";
    forgotError.style.display = 'block';
  }
});

// Add Blind Person button functionality
document.getElementById('addBlindPersonButton')?.addEventListener('click', function() {
  const blindName = prompt("Enter the blind person's name:");
  if (blindName) {
    currentUser.blindPeople.push({ name: blindName, location: { lat: 24.7136, lng: 46.6753 } });  // Sample location (Riyadh)
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    alert('Blind person added!');
    renderBlindPeople(); // Re-render the list of blind people
  }
});

// Render the list of blind people
function renderBlindPeople() {
  const blindPeopleList = document.getElementById('blindPeopleList');
  blindPeopleList.innerHTML = '';
  let blindPeople = currentUser ? currentUser.blindPeople : [];

  if (blindPeople.length === 0) {
    blindPeopleList.innerHTML = '<p>No blind people added yet.</p>';
    return;
  }

  blindPeople.forEach((blind, index) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<strong>${blind.name}</strong><br>Location: Lat ${blind.location.lat}, Lng ${blind.location.lng}`;
    
    // Add a button to show the location on map
    const showLocationButton = document.createElement('button');
    showLocationButton.textContent = 'Show Location on Map';
    showLocationButton.addEventListener('click', function() {
      initMap(blind.location.lat, blind.location.lng);  // Show blind person's location on map
      // Send coordinates to ESP32 via HTTP
      sendTargetToESP32(blind.location.lat, blind.location.lng);
    });

    card.appendChild(showLocationButton);
    blindPeopleList.appendChild(card);
  });
}

// Initialize the map
function initMap(lat = 24.7136, lng = 46.6753) {
  const location = { lat, lng };
  const map = new google.maps.Map(document.getElementById('map'), {
    center: location,
    zoom: 14,
  });

  const marker = new google.maps.Marker({
    position: location,
    map: map,
    title: 'Blind Person Location',
  });
}

// Send the target location to ESP32 via HTTP POST
function sendTargetToESP32(lat, lng) {
  fetch("http://ESP32_IP/sendTarget", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      latitude: lat,
      longitude: lng,
    }),
  })
  .then(response => response.json())
  .then(data => console.log("Target sent to ESP32:", data))
  .catch(error => console.error("Error sending target to ESP32:", error));
}
