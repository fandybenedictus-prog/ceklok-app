import React, { useState, useEffect, useRef } from 'react';
import { database } from './firebase';
import { ref, set, onValue, update, get, child } from "firebase/database";
import MapComponent from './components/MapComponent';
import { MapPin, ShoppingBag, User, LogOut, Radio, Loader2, Camera, CheckCircle, Smartphone } from 'lucide-react';

function App() {
  const [role, setRole] = useState(null); // 'seller' | 'buyer'

  // Persisted States
  const [username, setUsername] = useState(() => localStorage.getItem('username') || '');
  const [phone, setPhone] = useState(() => localStorage.getItem('phone') || '');
  const [itemName, setItemName] = useState(() => localStorage.getItem('itemName') || '');

  const [room, setRoom] = useState('');
  const [itemImage, setItemImage] = useState(null);
  const [mapLink, setMapLink] = useState('');

  const [joined, setJoined] = useState(false);
  const [myLocation, setMyLocation] = useState(null);
  const [otherLocations, setOtherLocations] = useState({});
  const [meetingPoint, setMeetingPoint] = useState(null);
  const [pickingLocation, setPickingLocation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transactionInfo, setTransactionInfo] = useState(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchCenter, setSearchCenter] = useState(null);

  // Persist form inputs
  useEffect(() => { localStorage.setItem('username', username); }, [username]);
  useEffect(() => { localStorage.setItem('phone', phone); }, [phone]);
  useEffect(() => { localStorage.setItem('itemName', itemName); }, [itemName]);

  // --- FIREBASE LOGIC START ---

  // 1. Listen for Updates (Location, Meeting Point) AFTER Joining
  useEffect(() => {
    if (joined && room) {
      // Listen to Meeting Point
      const meetingRef = ref(database, `rooms/${room}/meetingPoint`);
      const unsubMeeting = onValue(meetingRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setMeetingPoint(data);
        }
      });

      // Listen to All Locations in Room
      const locationsRef = ref(database, `rooms/${room}/locations`);
      const unsubLocations = onValue(locationsRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          // Filter out my own location
          const others = {};
          Object.keys(data).forEach(key => {
            if (key !== username) {
              others[key] = data[key];
            }
          });
          setOtherLocations(others);
        } else {
          setOtherLocations({});
        }
      });

      return () => {
        unsubMeeting();
        unsubLocations();
      };
    }
  }, [joined, room, username]);

  // 2. Location Tracking (GPS)
  useEffect(() => {
    if (joined && room && username) {
      const options = {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000
      };

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMyLocation([latitude, longitude]);

          // Update to Firebase
          update(ref(database, `rooms/${room}/locations/${username}`), {
            latitude,
            longitude,
            username,
            role,
            timestamp: Date.now()
          });
        },
        (error) => {
          console.error("Location error:", error);
        },
        options
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
        // Optional: Remove user from map when leaving (or keep last known location)
        // remove(ref(database, `rooms/${room}/locations/${username}`));
      };
    }
  }, [joined, room, username, role]);


  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery) return;

    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      const data = await response.json();
      setSearchResults(data);
      if (data.length > 0) {
        const firstResult = data[0];
        const lat = parseFloat(firstResult.lat);
        const lon = parseFloat(firstResult.lon);
        setSearchCenter([lat, lon]);

        if (role === 'seller') {
          setPickingLocation(true);
        }
      } else {
        alert('Lokasi tidak ditemukan');
      }
    } catch (error) {
      console.error("Search error:", error);
      alert('Gagal mencari lokasi');
    } finally {
      setIsSearching(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setItemImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateTransaction = async () => {
    if (!username || !phone || !itemName || !itemImage) {
      alert("Mohon lengkapi data barang dan foto");
      return;
    }

    setLoading(true);

    // Save Transaction Info to Firebase
    try {
      await set(ref(database, `rooms/${room}/info`), {
        sellerName: username,
        sellerPhone: phone,
        itemName,
        itemImage,
        createdAt: Date.now()
      });

      // Resolve Map Link if exists (Client-side regex or external API - here simplified)
      if (mapLink) {
        // Simple regex for lat,lng in URL
        const regex = /[-+]?([0-9]*\.[0-9]+)[,]([-+]?([0-9]*\.[0-9]+))/;
        const match = mapLink.match(regex);
        if (match && match.length >= 3) {
          const coords = [parseFloat(match[1]), parseFloat(match[2])];
          setMeetingPoint(coords);
          await set(ref(database, `rooms/${room}/meetingPoint`), coords);
        } else {
          setPickingLocation(true); // Fallback if link not parsable
        }
      } else {
        setPickingLocation(true);
      }

      setJoined(true);
    } catch (err) {
      alert("Gagal membuat transaksi: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckTransaction = async () => {
    if (!room) return alert("Masukkan ID Transaksi");
    setLoading(true);

    try {
      const snapshot = await get(child(ref(database), `rooms/${room}/info`));
      if (snapshot.exists()) {
        setTransactionInfo(snapshot.val());
        // Check if meeting point is already set
        const mpSnap = await get(child(ref(database), `rooms/${room}/meetingPoint`));
        if (mpSnap.exists()) {
          setMeetingPoint(mpSnap.val());
        }
      } else {
        alert("ID Transaksi tidak ditemukan.");
      }
    } catch (error) {
      console.error(error);
      alert("Error cek transaksi.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinTransaction = () => {
    if (!username) return alert("Masukkan Nama Anda");
    setJoined(true);
  };


  if (!role) {
    // Role Selection Screen
    return (
      <div className="h-screen w-full flex items-center justify-center p-6 bg-gradient-to-br from-blue-600 to-indigo-800">
        <div className="glass rounded-3xl p-8 w-full max-w-md shadow-2xl text-center">
          <h1 className="text-3xl font-bold text-white mb-8">Pilih Peran Anda</h1>
          <div className="space-y-4">
            <button onClick={() => { setRole('seller'); const id = 'TRX-' + Math.floor(Math.random() * 10000); setRoom(id); }} className="w-full glass bg-white/40 hover:bg-white/60 p-6 rounded-2xl flex items-center gap-4 transition-all group border border-white/40 text-left shadow-sm hover:shadow-md">
              <div className="bg-orange-500 p-4 rounded-full text-white shadow-lg group-hover:scale-110 transition-transform">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Saya Penjual</h3>
                <p className="text-gray-600 text-sm">Jual barang & tentukan lokasi</p>
              </div>
            </button>
            <button onClick={() => setRole('buyer')} className="w-full glass bg-white/40 hover:bg-white/60 p-6 rounded-2xl flex items-center gap-4 transition-all group border border-white/40 text-left shadow-sm hover:shadow-md">
              <div className="bg-green-500 p-4 rounded-full text-white shadow-lg group-hover:scale-110 transition-transform">
                <User className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Saya Pembeli</h3>
                <p className="text-gray-600 text-sm">Cari barang & temui penjual</p>
              </div>
            </button>
          </div>

        </div>
      </div>
    )
  }

  if (!joined) {
    // Form Screen (Split based on role)
    if (role === 'seller') {
      return (
        <div className="h-screen w-full flex items-center justify-center p-6 bg-gray-50 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden my-auto">
            <div className="p-6 bg-orange-500 text-white relative">
              <button onClick={() => setRole(null)} className="absolute top-4 left-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition">
                <LogOut className="w-4 h-4" />
              </button>
              <h2 className="text-2xl font-bold text-center mt-2">Data Penjual</h2>
            </div>

            <div className="p-8 space-y-5">
              {/* Seller Form Fields */}
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-600 ml-1">Nama Lengkap</label>
                <div className="relative group">
                  <User className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pl-12 focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="Contoh: Budi Santoso" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-600 ml-1">Nomor WhatsApp</label>
                <div className="relative group">
                  <Smartphone className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pl-12 focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="0812..." />
                </div>
              </div>

              <div className="border-t border-dashed border-gray-300 my-4 pt-4"></div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-600 ml-1">Nama Barang</label>
                <div className="relative group">
                  <ShoppingBag className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
                  <input type="text" value={itemName} onChange={e => setItemName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pl-12 focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="Contoh: iPhone 11 Bekas" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-600 ml-1">Foto Barang</label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:bg-gray-50 transition cursor-pointer relative overflow-hidden group">
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                  {itemImage ? (
                    <div className="relative">
                      <img src={itemImage} alt="Preview" className="h-32 w-full object-cover rounded-lg mx-auto" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white text-sm font-bold">Ganti Foto</div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-gray-400">
                      <Camera className="w-10 h-10 mb-2" />
                      <span className="text-sm">Tap untuk upload foto</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-600 ml-1">Link Google Maps (Opsional)</label>
                <div className="relative group">
                  <MapPin className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
                  <input type="text" value={mapLink} onChange={e => setMapLink(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pl-12 focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="Paste link lokasi disini..." />
                </div>
                <p className="text-[10px] text-gray-400 ml-1">Otomatis set titik temu jika diisi.</p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-gray-600 ml-1">ID Transaksi (Auto)</label>
                <div className="p-3 bg-gray-100 rounded-xl text-center font-mono font-bold text-gray-700 tracking-widest border border-gray-200">
                  {room}
                </div>
                <p className="text-xs text-gray-500 text-center">Berikan ID ini kepada pembeli</p>
              </div>

              <button
                onClick={handleCreateTransaction}
                disabled={loading}
                className={`w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-6`}
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Buat Transaksi'}
              </button>
            </div>
          </div>
        </div>
      )
    }

    // Role Buyer
    return (
      <div className="h-screen w-full flex items-center justify-center p-6 bg-gray-50 overflow-y-auto">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden my-auto">
          <div className="p-6 bg-green-500 text-white relative">
            <button onClick={() => { setRole(null); setTransactionInfo(null); }} className="absolute top-4 left-4 p-2 bg-white/20 rounded-full hover:bg-white/30 transition">
              <LogOut className="w-4 h-4" />
            </button>
            <h2 className="text-2xl font-bold text-center mt-2">Data Pembeli</h2>
          </div>

          <div className="p-8 space-y-5">
            {/* Buyer Step 1: Input ID */}
            {!transactionInfo ? (
              <>
                <div className="text-center mb-6">
                  <h3 className="text-lg font-bold text-gray-800">Cari Barang</h3>
                  <p className="text-sm text-gray-500">Masukkan ID Transaksi dari penjual untuk melihat barang</p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-600 ml-1">ID Transaksi</label>
                  <div className="relative group">
                    <Radio className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
                    <input type="text" value={room} onChange={e => setRoom(e.target.value.toUpperCase().trim())} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pl-12 focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="Masukkan ID..." />
                  </div>
                </div>
                <button
                  onClick={handleCheckTransaction}
                  disabled={loading}
                  className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-6"
                >
                  {loading ? <Loader2 className="animate-spin" /> : 'Cek Transaksi'}
                </button>
              </>
            ) : (
              /* Buyer Step 2: Preview & Data */
              <div className="space-y-6 animate-fade-in-up">
                {/* Preview Item */}
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-center">
                  <img src={transactionInfo.itemImage} alt="Item" className="w-full h-40 object-cover rounded-xl mb-3" />
                  <h3 className="text-xl font-bold text-gray-800">{transactionInfo.itemName}</h3>
                  <div className="flex justify-center items-center gap-2 text-sm text-gray-600 mt-1">
                    <User className="w-4 h-4" /> <span>{transactionInfo.sellerName}</span>
                  </div>
                  <div className="mt-2 text-xs bg-green-100 text-green-700 py-1 px-3 rounded-full inline-block">ID: {room}</div>
                </div>

                <div className="border-t border-dashed border-gray-300"></div>

                {/* Buyer Data Inputs */}
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-600 ml-1">Nama Anda</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
                    <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pl-12 focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="Nama..." />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-600 ml-1">Nomor WhatsApp</label>
                  <div className="relative group">
                    <Smartphone className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
                    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 pl-12 focus:ring-2 focus:ring-blue-500 outline-none transition" placeholder="08..." />
                  </div>
                </div>

                <button
                  onClick={handleJoinTransaction}
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
                >
                  {loading ? <Loader2 className="animate-spin" /> : 'Gabung & Lihat Lokasi'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Map Screen
  return (
    <div className="h-screen w-full relative">
      {/* Top Info Bar */}
      <div className="absolute top-4 left-4 right-4 z-[1000] space-y-2 pointer-events-none">

        {/* Search Bar (Only for Seller when picking location) */}
        {role === 'seller' && (
          <div className="glass bg-white/90 p-2 rounded-2xl shadow-lg pointer-events-auto flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
              placeholder="🔍 Cari lokasi (misal: Monas, Stasiun Gambir)..."
              className="flex-1 bg-transparent outline-none text-sm px-2 text-gray-700"
            />
            <button onClick={handleSearch} disabled={isSearching} className="bg-blue-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-blue-600 transition">
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cari'}
            </button>
          </div>
        )}

        <div className="glass bg-white/90 p-3 rounded-2xl shadow-lg flex justify-between items-center pointer-events-auto">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-full ${role === 'seller' ? 'bg-orange-100' : 'bg-green-100'}`}>
              <Radio className={`w-4 h-4 animate-pulse ${role === 'seller' ? 'text-orange-600' : 'text-green-600'}`} />
            </div>
            <div>
              <h2 className="font-bold text-gray-800 text-xs uppercase tracking-wide">ID: {room}</h2>
              <p className="text-[10px] text-gray-500">{role === 'seller' ? 'Mode Penjual' : 'Mode Pembeli'}</p>
            </div>
          </div>
          <button onClick={() => window.location.reload()} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition"><LogOut className="w-4 h-4" /></button>
        </div>

        {/* Seller Notification if Point not set */}
        {role === 'seller' && !meetingPoint && (
          <div className="glass bg-white text-black border-2 border-red-500 p-3 rounded-xl text-xs font-bold text-center animate-bounce shadow-xl z-[2000]">
            ⚠️ Tentukan titik temu di peta!
          </div>
        )}

        {/* Item Info Card (Only relevant if info exists) */}
        {(role === 'seller' || transactionInfo) && (
          <div className="glass bg-white/90 p-3 rounded-2xl shadow-lg flex gap-3 pointer-events-auto animate-fade-in-down">
            <img src={role === 'seller' ? itemImage : transactionInfo?.itemImage} className="w-16 h-16 rounded-lg object-cover bg-gray-200" alt="Item" />
            <div>
              <h3 className="font-bold text-gray-800 text-sm">{role === 'seller' ? itemName : transactionInfo?.itemName || 'Loading...'}</h3>
              <p className="text-xs text-gray-500 line-clamp-1">{role === 'seller' ? `Penjual: ${username}` : `Penjual: ${transactionInfo?.sellerName || '...'}`}</p>
              <p className="text-xs text-blue-600 font-medium mt-1">{role === 'seller' ? `Hp: ${phone}` : `Hp: ${transactionInfo?.sellerPhone || '...'}`}</p>
            </div>
          </div>
        )}
      </div>

      <MapComponent
        myLocation={myLocation}
        otherLocations={otherLocations}
        meetingPoint={meetingPoint}
        searchCenter={searchCenter}
        isPicking={pickingLocation}
        onSetMeetingPoint={(latlng) => {
          if (role === 'buyer') {
            alert("Hanya penjual yang bisa menentukan detail meeting point. Anda bisa menyetujuinya.");
            return;
          }
          if (pickingLocation) {
            const coords = [latlng.lat, latlng.lng];
            setMeetingPoint(coords);
            set(ref(database, `rooms/${room}/meetingPoint`), coords); // DB update
            setPickingLocation(false);
          }
        }}
      />

      {/* Bottom Actions */}
      <div className="absolute bottom-8 left-0 right-0 z-[1000] flex justify-center px-6 pointer-events-none">
        {role === 'seller' ? (
          pickingLocation ? (
            <div className="bg-orange-600 text-white px-8 py-4 rounded-full shadow-2xl font-bold animate-bounce pointer-events-auto flex gap-3 items-center border-4 border-white z-[2000]">
              <MapPin className="w-6 h-6" />
              TAP PETA (Tentukan Lokasi)
            </div>
          ) : (
            <button
              className="pointer-events-auto glass bg-gradient-to-r from-orange-500 to-red-500 text-white pl-6 pr-8 py-4 rounded-full shadow-2xl font-bold hover:scale-105 active:scale-95 transition-all flex items-center gap-3 border border-white/20"
              onClick={() => setPickingLocation(true)}
            >
              <MapPin className="w-5 h-5" />
              Set Meeting Point
            </button>
          )
        ) : (
          // Buyer View
          meetingPoint ? (
            <div className="pointer-events-auto glass bg-green-600 text-white px-8 py-4 rounded-full shadow-xl font-bold flex items-center gap-3 animate-pulse-ring">
              <CheckCircle className="w-6 h-6" />
              Meeting Point Disetujui
            </div>
          ) : (
            <div className="glass bg-gray-800/80 text-white px-6 py-3 rounded-full shadow-lg text-sm backdrop-blur-md">
              Menunggu Penjual set lokasi...
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default App;
