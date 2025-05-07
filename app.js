// ESP32 configuration
const ESP32_IP = "192.168.4.1";  // تأكد من عنوان ESP32 الصحيح
const ESP32_GPS_ENDPOINT = `http://${ESP32_IP}/`;

// تخزين المستخدمين في localStorage
let users = JSON.parse(localStorage.getItem('users')) || [];
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

// تعريف المتغيرات
let map;
let currentMarker;
let destinationMarker;
let currentLocation = { lat: 24.7136, lng: 46.6753 }; // الموقع الافتراضي (الرياض)
let gpsConnected = false;

// التحقق من تسجيل الدخول
if (!currentUser) {
  window.location.href = 'index.html'; // الانتقال إلى صفحة تسجيل الدخول إذا لم يكن هناك مستخدم حالي
}

// تهيئة الخريطة باستخدام Mapbox
function initMap() {
  // إعداد مفتاح الوصول لـ Mapbox
  mapboxgl.accessToken = 'pk.eyJ1IjoiYWhtZWQxNzE3IiwiYSI6ImNtOXEwOW81ajFnNGwybnF1aG4zcjU5OWEifQ.upl_DmMfS1tHBCx-3IBcnw';

  map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    center: [currentLocation.lng, currentLocation.lat],
    zoom: 14
  });

  // إضافة Marker للموقع الحالي
  currentMarker = new mapboxgl.Marker({ color: "#3FB1CE" })
    .setLngLat([currentLocation.lng, currentLocation.lat])
    .addTo(map);

  // إضافة Marker للموقع الوجهة
  destinationMarker = new mapboxgl.Marker({ color: "#FF0000" })
    .addTo(map);
  destinationMarker.remove(); // إخفاءه في البداية

  // الاستماع للأحداث عند النقر على الخريطة لتحديد الوجهة
  map.on("click", function (event) {
    const destination = event.lngLat;
    document.getElementById("destLatDisplay").textContent = destination.lat.toFixed(6);
    document.getElementById("destLngDisplay").textContent = destination.lng.toFixed(6);

    // تحديث Marker الوجهة
    destinationMarker.setLngLat(destination).addTo(map);
  });

  // بدء جلب بيانات GPS من ESP32
  fetchGPSData();
}

// جلب بيانات GPS من ESP32
function fetchGPSData() {
  fetch(ESP32_GPS_ENDPOINT)
    .then(response => response.json())
    .then(data => {
      if (data && data.latitude && data.longitude) {
        currentLocation = { 
          lat: parseFloat(data.latitude), 
          lng: parseFloat(data.longitude) 
        };

        // تحديث الوضع
        gpsConnected = true;
        document.getElementById("gpsStatus").className = "connected";
        document.getElementById("gpsStatus").textContent = "GPS Status: Connected";

        // تحديث عرض الموقع الحالي
        document.getElementById("latDisplay").textContent = currentLocation.lat.toFixed(6);
        document.getElementById("lngDisplay").textContent = currentLocation.lng.toFixed(6);
        document.getElementById("lastUpdated").textContent = new Date().toLocaleTimeString();

        // تحديث Marker الموقع الحالي
        currentMarker.setLngLat([currentLocation.lng, currentLocation.lat]);

        // تحريك الخريطة إلى الموقع الحالي
        if (map && !map.isMoving()) {
          map.flyTo({
            center: [currentLocation.lng, currentLocation.lat],
            zoom: 15
          });
        }

        // تحديث موقع الشخص المكفوف إذا تم اختياره
        updateSelectedBlindPerson();
      }
    })
    .catch(error => {
      console.error("Error fetching GPS data:", error);
      gpsConnected = false;
      document.getElementById("gpsStatus").className = "disconnected";
      document.getElementById("gpsStatus").textContent = "GPS Status: Disconnected - Check ESP32";
    })
    .finally(() => {
      // جلب البيانات كل 2 ثانية
      setTimeout(fetchGPSData, 2000);
    });
}

// إرسال الإحداثيات إلى ESP32 عبر HTTP POST
function sendTargetToESP32(lat, lng) {
  fetch(`http://${ESP32_IP}/target?lat=${lat}&lng=${lng}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ latitude: lat, longitude: lng })
  })
  .then(response => response.json())
  .then(data => console.log("Target sent to ESP32:", data))
  .catch(error => console.error("Error sending target to ESP32:", error));
}

// إضافة شخص كفيف جديد
document.getElementById('addBlindPersonButton').addEventListener('click', function() {
  const blindName = prompt("Enter the blind person's name:");
  if (blindName) {
    currentUser.blindPeople.push({ 
      name: blindName, 
      location: { ...currentLocation }, // استخدام الموقع الحالي
      selected: false
    });
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    alert('Blind person added!');
    renderBlindPeople(); // إعادة عرض قائمة الأشخاص المكفوفين
  }
});

// عرض قائمة الأشخاص المكفوفين
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
    card.innerHTML = `<strong>${blind.name}</strong><br>Location: Lat ${blind.location.lat.toFixed(6)}, Lng ${blind.location.lng.toFixed(6)}`;

    // إضافة زر لعرض الموقع على الخريطة
    const showLocationButton = document.createElement('button');
    showLocationButton.textContent = 'Show Location on Map';
    showLocationButton.addEventListener('click', function() {
      initMap(blind.location.lat, blind.location.lng);  // عرض موقع الشخص المكفوف على الخريطة
      sendTargetToESP32(blind.location.lat, blind.location.lng); // إرسال الإحداثيات إلى ESP32
    });

    card.appendChild(showLocationButton);
    blindPeopleList.appendChild(card);
  });
}

// تحديث موقع الشخص المكفوف المختار
function updateSelectedBlindPerson() {
  let blindPeople = JSON.parse(localStorage.getItem('blindPeople')) || [];
  const selectedIndex = blindPeople.findIndex(p => p.selected);
  
  if (selectedIndex !== -1) {
    blindPeople[selectedIndex].location = { ...currentLocation };
    localStorage.setItem('blindPeople', JSON.stringify(blindPeople));
    renderBlindPeople(); // تحديث المعلومات المعروضة
  }
}

// إرسال الإحداثيات للهدف عند النقر على الزر
document.getElementById('sendTargetButton').addEventListener('click', function() {
  const lat = document.getElementById('destLatDisplay').textContent;
  const lng = document.getElementById('destLngDisplay').textContent;

  if (lat === 'N/A' || lng === 'N/A') {
    alert('Please set a destination by clicking on the map first.');
    return;
  }

  sendTargetToESP32(lat, lng);
});

// تهيئة الخريطة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
  initMap();
  renderBlindPeople();
});
