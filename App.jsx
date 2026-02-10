import React, { useState, useEffect, useMemo } from 'react';
import { 
  Book, Heart, Users, FileText, Menu, X, 
  Copy, Check, Home, Info, BookOpen, Share2, 
  ChevronRight, Calendar, User, Cloud, RefreshCw, Trash2
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc } from 'firebase/firestore';

// --- KONFIGURASI FIREBASE ---
// PENTING UNTUK DEPLOY VERCEL:
// Saat di komputer Anda, HAPUS blok kode "Preview Environment" di bawah ini
// dan GANTI dengan config dari Firebase Console Anda sendiri.

// [Awal Blok Preview] - Hapus blok ini di Vercel nanti
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : { apiKey: "demo-key" }; // Placeholder agar tidak error saat copy-paste awal
// [Akhir Blok Preview]

/* [CONTOH CONFIG UNTUK VERCEL - Gunakan format ini nanti]
const firebaseConfig = {
  apiKey: "AIzaSyAKdyIHl7_Wd2ZqeFsS6LxXfQ6VkSfhXEs",
  authDomain: "buku-saku-gkps.firebaseapp.com",
  projectId: "buku-saku-gkps",
  storageBucket: "buku-saku-gkps.firebasestorage.app",
  messagingSenderId: "95326784130",
  appId: "1:95326784130:web:95af9c787c47ead147029b",
  measurementId: "G-Z9NW1YE2MX"
};*/

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Gunakan "gkps-app-web" saat deploy, atau biarkan default untuk preview
const appId = typeof __app_id !== 'undefined' ? __app_id : 'gkps-app-web';

const App = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [showShareSuccess, setShowShareSuccess] = useState(false);
  
  // Auth & Data State
  const [user, setUser] = useState(null);
  const [riwayatLaporan, setRiwayatLaporan] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Scroll to top when tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  // 1. Firebase Auth
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth Error:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // 2. Firebase Data Fetching (Real-time)
  useEffect(() => {
    if (!user) return;

    // Menggunakan PUBLIC collection agar bisa diakses cross-device (HP ke Laptop)
    const reportsRef = collection(db, 'artifacts', appId, 'public', 'data', 'laporan_parjumatanganan');

    const unsubscribe = onSnapshot(reportsRef, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // Sort di memory (terbaru di atas)
        data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setRiwayatLaporan(data);
      },
      (error) => {
        console.error("Error fetching data:", error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Data State untuk Form Laporan
  const [laporan, setLaporan] = useState({
    namaSintua: '',
    jumatanganan: '',
    tanggal: new Date().toISOString().split('T')[0], // Default hari ini
    tuanRumah: '',
    hadirBapa: '',
    hadirInang: '',
    hadirNaposo: '',
    hadirASM: '',
    pokokDoa: '',
    persembahan: '',
    tema: '',
    catatan: ''
  });

  // Filter Riwayat berdasarkan Nama Sintua yang sedang diketik
  const myReports = useMemo(() => {
    if (!laporan.namaSintua) return [];
    const searchName = laporan.namaSintua.toLowerCase().trim();
    return riwayatLaporan.filter(item => 
      item.namaSintua && item.namaSintua.toLowerCase().includes(searchName)
    );
  }, [riwayatLaporan, laporan.namaSintua]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setLaporan(prev => ({ ...prev, [name]: value }));
  };

  const generateLaporanText = (data = laporan) => {
    const totalHadir = (parseInt(data.hadirBapa || 0) + parseInt(data.hadirInang || 0) + parseInt(data.hadirNaposo || 0) + parseInt(data.hadirASM || 0));
    
    return `*LAPORAN PARTONGGOAN PARJUMATANGANAN GKPS*
    
a. Nama: ${data.namaSintua}
b. Juma Tanganan: 
${data.jumatanganan}
c. Tanggal: ${data.tanggal}
d. Tempat Rumah: ${data.tuanRumah}
e. Jumlah Hadir: ${totalHadir} Halak
   - Bapa: ${data.hadirBapa} 
   - Inang: ${data.hadirInang}
   - Namaposo: ${data.hadirNaposo}
   - Sikolah Minggu: ${data.hadirASM}
f. Pokok Doa: ${data.pokokDoa}
g. Galangan: Rp ${data.persembahan}
h. Tema Renungan: ${data.tema}
i. Catatan Khusus: ${data.catatan}

_Laporan ini dibuat melalui Aplikasi Buku Saku GKPS_`;
  };

  // Helper function for safer copying (Fix Clipboard Error)
  const safeCopy = (text, onSuccess) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      
      // Ensure it's not visible but part of DOM to avoid scrolling
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful && onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Copy failed:', err);
      // Fallback manual alert if really failed
      alert("Gagal menyalin otomatis. Mohon salin manual.");
    }
  };

  const copyToClipboard = (data = laporan) => {
    const text = generateLaporanText(data);
    safeCopy(text, () => {
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 3000);
    });
  };

  const saveToCloud = async () => {
    if (!user) return;
    if (!laporan.namaSintua || !laporan.tanggal) {
      alert("Mohon lengkapi Nama Sintua dan Tanggal terlebih dahulu.");
      return;
    }

    setIsSaving(true);
    try {
      const reportsRef = collection(db, 'artifacts', appId, 'public', 'data', 'laporan_parjumatanganan');
      await addDoc(reportsRef, {
        ...laporan,
        createdAt: new Date().toISOString(),
        userId: user.uid
      });
      alert("Laporan berhasil disimpan ke Cloud! Data kini aman.");
    } catch (error) {
      console.error("Error saving:", error);
      alert("Gagal menyimpan data. Pastikan config Firebase sudah benar.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteReport = async (id) => {
    if (!confirm("Hapus laporan ini dari riwayat?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'laporan_parjumatanganan', id));
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const loadReport = (data) => {
    setLaporan({
      namaSintua: data.namaSintua || '',
      jumatanganan: data.jumatanganan || '',
      tanggal: data.tanggal || '',
      tuanRumah: data.tuanRumah || '',
      hadirBapa: data.hadirBapa || '',
      hadirInang: data.hadirInang || '',
      hadirNaposo: data.hadirNaposo || '',
      hadirASM: data.hadirASM || '',
      pokokDoa: data.pokokDoa || '',
      persembahan: data.persembahan || '',
      tema: data.tema || '',
      catatan: data.catatan || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const shareApp = () => {
    const url = window.location.href;
    safeCopy(url, () => {
      setShowShareSuccess(true);
      setTimeout(() => setShowShareSuccess(false), 3000);
    });
  };

  // Komponen Navigasi Sidebar (Laptop)
  const SidebarItem = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center space-x-3 w-full p-3 rounded-lg transition-all duration-200 mb-1 ${
        activeTab === id 
          ? 'bg-blue-800 text-white shadow-md font-semibold' 
          : 'text-blue-100 hover:bg-blue-800/50 hover:text-white'
      }`}
    >
      <Icon size={20} />
      <span>{label}</span>
      {activeTab === id && <ChevronRight size={16} className="ml-auto opacity-50" />}
    </button>
  );

  const SectionTitle = ({ children }) => (
    <h2 className="text-xl md:text-2xl font-bold text-blue-900 border-b-2 border-blue-200 pb-2 mb-6 mt-2 flex items-center">
      {children}
    </h2>
  );

  const ContentCard = ({ children, className = "" }) => (
    <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-100 ${className}`}>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-800 flex flex-col md:flex-row">
      
      {/* SIDEBAR NAVIGATION (Laptop) */}
      <aside className="hidden md:flex flex-col w-72 bg-blue-900 text-white h-screen sticky top-0 shadow-2xl z-20 overflow-y-auto">
        <div className="p-6 flex items-center space-x-3 border-b border-blue-800">
          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-blue-900 font-bold text-xs border-2 border-yellow-400 shadow-lg">
            GKPS
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none">Buku Saku</h1>
            <span className="text-blue-300 text-xs">Parjumatanganan Online</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <div className="text-xs font-bold text-blue-300 uppercase tracking-wider mb-2 mt-2 px-3">Menu Utama</div>
          <SidebarItem id="home" label="Beranda" icon={Home} />
          <SidebarItem id="tataibadah" label="Tata Ibadah" icon={Heart} />
          <SidebarItem id="laporan" label="Laporan & Cloud" icon={FileText} />
          
          <div className="text-xs font-bold text-blue-300 uppercase tracking-wider mb-2 mt-6 px-3">Buku Pedoman</div>
          <SidebarItem id="pendahuluan" label="Pendahuluan" icon={Info} />
          <SidebarItem id="juklak" label="Juklak & Struktur" icon={Book} />
          <SidebarItem id="etika" label="Etika & Pengajaran" icon={Users} />
        </nav>

        <div className="p-4 border-t border-blue-800 bg-blue-950">
          <div className="text-xs text-blue-300 text-center">
            &copy; 2026 GKPS<br/>Aplikasi Pelayanan Digital
          </div>
        </div>
      </aside>

      {/* MOBILE HEADER */}
      <header className="md:hidden bg-blue-900 text-white sticky top-0 z-50 shadow-md">
        <div className="px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-blue-900 font-bold text-xs border-2 border-yellow-400">
              GKPS
            </div>
            <h1 className="font-bold text-lg">Parjumatanganan</h1>
          </div>
          <button onClick={shareApp} className="p-2 hover:bg-blue-800 rounded-full">
            {showShareSuccess ? <Check size={20} className="text-green-400"/> : <Share2 size={20} />}
          </button>
        </div>
      </header>

      {/* MOBILE MENU DRAWER */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="absolute bottom-20 right-4 left-4 bg-white rounded-2xl shadow-2xl p-2 animate-bounce-up" onClick={e => e.stopPropagation()}>
            <div className="text-center font-bold text-gray-400 text-xs py-2 uppercase tracking-widest">Buku Pedoman</div>
            <div className="grid grid-cols-1 gap-1">
              <button onClick={() => {setActiveTab('pendahuluan'); setIsMobileMenuOpen(false)}} className="p-3 text-left hover:bg-blue-50 rounded-xl flex items-center text-gray-700 font-medium">
                <Info size={18} className="mr-3 text-blue-600"/> Pendahuluan & Dasar
              </button>
              <button onClick={() => {setActiveTab('juklak'); setIsMobileMenuOpen(false)}} className="p-3 text-left hover:bg-blue-50 rounded-xl flex items-center text-gray-700 font-medium">
                <Book size={18} className="mr-3 text-blue-600"/> Petunjuk Pelaksanaan
              </button>
              <button onClick={() => {setActiveTab('etika'); setIsMobileMenuOpen(false)}} className="p-3 text-left hover:bg-blue-50 rounded-xl flex items-center text-gray-700 font-medium">
                <Users size={18} className="mr-3 text-blue-600"/> Etika & Pengajaran
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 overflow-y-auto w-full max-w-5xl mx-auto">
        
        {/* VIEW: HOME */}
        {activeTab === 'home' && (
          <div className="space-y-6 animate-fade-in">
            {/* Banner Utama */}
            <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-2xl p-6 md:p-10 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 opacity-10 transform translate-x-10 -translate-y-10">
                <div className="text-[150px]">✝</div>
              </div>
              <div className="relative z-10">
                <h2 className="text-2xl md:text-4xl font-bold mb-2">Syalom, Sintua!</h2>
                <p className="text-blue-100 mb-6 max-w-lg md:text-lg">
                  Aplikasi Buku Saku GKPS 2026 kini dilengkapi fitur penyimpanan Cloud.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={() => setActiveTab('tataibadah')}
                    className="bg-yellow-500 hover:bg-yellow-400 text-blue-900 font-bold py-3 px-6 rounded-lg shadow-lg transition-transform transform hover:scale-105 active:scale-95 flex items-center justify-center"
                  >
                    <Heart size={20} className="mr-2"/> Mulai Ibadah
                  </button>
                  <button 
                    onClick={() => setActiveTab('laporan')}
                    className="bg-white/10 hover:bg-white/20 text-white font-medium py-3 px-6 rounded-lg border border-white/30 backdrop-blur-sm flex items-center justify-center transition-colors"
                  >
                    <Cloud size={20} className="mr-2"/> Kelola Laporan
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div onClick={() => setActiveTab('juklak')} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-3 group-hover:scale-110 transition-transform">
                  <Book size={20} />
                </div>
                <h3 className="font-bold text-gray-800">Pedoman</h3>
                <p className="text-sm text-gray-500">Lihat aturan & struktur</p>
              </div>
              <div onClick={() => setActiveTab('laporan')} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-3 group-hover:scale-110 transition-transform">
                  <FileText size={20} />
                </div>
                <h3 className="font-bold text-gray-800">Laporan Cloud</h3>
                <p className="text-sm text-gray-500">Simpan online & kirim WA</p>
              </div>
              <div className="bg-blue-50 p-5 rounded-xl border border-blue-100">
                <h3 className="font-bold text-blue-900 mb-1">Ayat Harian</h3>
                <p className="italic text-blue-800 text-sm">
                  "Sebab di mana dua atau tiga orang berkumpul dalam Nama-Ku, di situ Aku ada."
                </p>
                <p className="text-right text-xs font-bold mt-2 text-blue-600">Matius 18:20</p>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: PENDAHULUAN */}
        {activeTab === 'pendahuluan' && (
          <div className="space-y-6 animate-fade-in max-w-4xl">
            <ContentCard>
              <SectionTitle><Info className="mr-3" /> Pendahuluan</SectionTitle>
              <p className="mb-6 leading-relaxed text-gray-700 text-lg">
                Ibadah Parjuma Tanganan adalah bentuk persekutuan kecil jemaat di rumah-rumah warga jemaat GKPS, yang dilaksanakan untuk mempererat kasih, memperdalam firman Tuhan, dan menghadirkan kehidupan ibadah dalam keluarga.
              </p>
              <div className="bg-blue-50 p-6 rounded-lg border-l-4 border-blue-500">
                <h4 className="font-bold text-blue-900 mb-2">Peran Sintua</h4>
                <p className="text-blue-800">
                  Sintua Parjumatanganan adalah perpanjangan tangan gereja dalam pelayanan kepada keluarga secara nyata, bertanggung jawab atas pembinaan rohani dan koordinasi kegiatan.
                </p>
              </div>
            </ContentCard>

            <ContentCard>
              <SectionTitle>Dasar Alkitabiah</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <span className="font-bold text-blue-600 block mb-1">Matius 18:20</span>
                  <p className="text-sm text-gray-600">Kehadiran Tuhan dalam persekutuan kecil.</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <span className="font-bold text-blue-600 block mb-1">Kis 2:46-47</span>
                  <p className="text-sm text-gray-600">Teladan jemaat mula-mula yang berkumpul di rumah.</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <span className="font-bold text-blue-600 block mb-1">Ibrani 10:24-25</span>
                  <p className="text-sm text-gray-600">Saling menasihati & tidak menjauhkan diri dari ibadah.</p>
                </div>
              </div>
            </ContentCard>
          </div>
        )}

        {/* VIEW: JUKLAK */}
        {activeTab === 'juklak' && (
          <div className="space-y-6 animate-fade-in max-w-4xl">
             <ContentCard>
              <SectionTitle><Users className="mr-3"/> Struktur Pelaksana</SectionTitle>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-gray-100 rounded-lg hover:bg-blue-50 transition-colors">
                  <h4 className="font-bold text-blue-900">1. Pimpinan Majelis (PMJ)</h4>
                  <p className="text-sm text-gray-600 mt-1">Menetapkan jadwal pelaksanaan ibadah.</p>
                </div>
                <div className="p-4 border border-gray-100 rounded-lg hover:bg-blue-50 transition-colors">
                  <h4 className="font-bold text-blue-900">2. Sintua</h4>
                  <p className="text-sm text-gray-600 mt-1">Membina, memimpin, dan melaporkan kegiatan.</p>
                </div>
                <div className="p-4 border border-gray-100 rounded-lg hover:bg-blue-50 transition-colors">
                  <h4 className="font-bold text-blue-900">3. Tuan Rumah</h4>
                  <p className="text-sm text-gray-600 mt-1">Menyediakan tempat dan membantu persiapan.</p>
                </div>
                <div className="p-4 border border-gray-100 rounded-lg hover:bg-blue-50 transition-colors">
                  <h4 className="font-bold text-blue-900">4. Pengurus Sektor</h4>
                  <p className="text-sm text-gray-600 mt-1">Koordinasi dan pengawasan wilayah.</p>
                </div>
              </div>
            </ContentCard>

            <ContentCard>
              <SectionTitle><Book className="mr-3"/> Aturan Teknis</SectionTitle>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold mr-3 flex-shrink-0">4</div>
                  <div>
                    <span className="font-bold text-gray-900">Keluarga Binaan</span>
                    <p className="text-sm text-gray-600">Satu orang Sintua membina 4 keluarga.</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold mr-3 flex-shrink-0">4x</div>
                  <div>
                    <span className="font-bold text-gray-900">Frekuensi</span>
                    <p className="text-sm text-gray-600">Dilaksanakan minimal 4 kali setahun.</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold mr-3 flex-shrink-0">90</div>
                  <div>
                    <span className="font-bold text-gray-900">Durasi</span>
                    <p className="text-sm text-gray-600">Estimasi waktu ibadah 60-90 menit.</p>
                  </div>
                </li>
              </ul>
            </ContentCard>
          </div>
        )}

        {/* VIEW: TATA IBADAH */}
        {activeTab === 'tataibadah' && (
          <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
             <div className="bg-blue-100 p-4 rounded-lg border border-blue-200 flex items-start">
               <Info className="text-blue-600 mr-3 flex-shrink-0 mt-1" size={20}/>
               <p className="text-sm text-blue-800">Panduan Liturgi Ibadah. Centang kotak di sebelah kiri untuk menandai bagian yang sudah selesai.</p>
             </div>

             <ContentCard>
              <SectionTitle><Heart className="mr-3 text-red-500"/> Liturgi Ibadah</SectionTitle>
              <div className="divide-y divide-gray-100">
                {[
                  { title: "1. Saat Teduh", desc: "Mempersiapkan hati menghadap Tuhan" },
                  { title: "2. Votum - Introitus - Doa", desc: "Pembukaan Ibadah" },
                  { title: "3. Nyanyian", desc: "Pujian Pembuka" },
                  { title: "4. Khotbah / Pengajaran", desc: "Firman Tuhan" },
                  { title: "5. Nyanyian", desc: "Respon atas Firman" },
                  { title: "6. Doa Syafaat / Doa Berantai", desc: "Mendoakan pokok-pokok doa" },
                  { title: "7. Nyanyian (Persembahan)", desc: "Mengumpulkan persembahan syukur" },
                  { title: "8. Doa Penutup & Berkat", desc: "Doa Persembahan - Bapa Kami - Berkat" }
                ].map((item, idx) => (
                  <label key={idx} className="flex items-start p-4 hover:bg-gray-50 cursor-pointer transition-colors group">
                    <div className="relative flex items-center mt-1">
                      <input type="checkbox" className="peer w-6 h-6 border-2 border-gray-300 rounded text-blue-600 focus:ring-blue-500 cursor-pointer" />
                      <Check size={16} className="absolute top-1 left-1 text-white opacity-0 peer-checked:opacity-100 pointer-events-none"/>
                    </div>
                    <div className="ml-4">
                      <h3 className="font-bold text-gray-800 peer-checked:text-gray-400 peer-checked:line-through transition-all">{item.title}</h3>
                      <p className="text-sm text-gray-500">{item.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </ContentCard>

            <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-200 shadow-sm">
              <h3 className="font-bold text-yellow-800 mb-4 flex items-center text-lg">
                <Users className="mr-2" size={20}/>
                Pokok Doa Syafaat
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-white/60 p-3 rounded-lg text-sm text-yellow-900 border border-yellow-100">
                  🏠 Keluarga Tuan Rumah
                </div>
                <div className="bg-white/60 p-3 rounded-lg text-sm text-yellow-900 border border-yellow-100">
                  🤒 Orang Sakit / Berduka
                </div>
                <div className="bg-white/60 p-3 rounded-lg text-sm text-yellow-900 border border-yellow-100">
                  ⛪ Pelayanan Gereja & Sintua
                </div>
                <div className="bg-white/60 p-3 rounded-lg text-sm text-yellow-900 border border-yellow-100">
                  🇮🇩 Bangsa dan Negara
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: ETIKA */}
        {activeTab === 'etika' && (
          <div className="space-y-6 animate-fade-in max-w-4xl">
             <ContentCard>
               <SectionTitle><Users className="mr-3"/> Etika Ibadah</SectionTitle>
               <div className="grid md:grid-cols-2 gap-6">
                 <div>
                   <h4 className="font-bold text-blue-900 mb-3 flex items-center"><User className="mr-2" size={18}/> Sikap Ibadah</h4>
                   <ul className="space-y-2 text-gray-700 bg-gray-50 p-4 rounded-xl">
                     <li className="flex items-start"><span className="text-blue-500 mr-2">•</span>Datang tepat waktu & rapi.</li>
                     <li className="flex items-start"><span className="text-blue-500 mr-2">•</span>Menjaga ketenangan.</li>
                     <li className="flex items-start"><span className="text-blue-500 mr-2">•</span>Ciptakan suasana damai.</li>
                     <li className="flex items-start"><span className="text-red-500 mr-2">•</span><strong>Jangan</strong> curhat masalah pribadi.</li>
                   </ul>
                 </div>
                 <div>
                   <h4 className="font-bold text-blue-900 mb-3 flex items-center"><Share2 className="mr-2" size={18}/> Komunikasi</h4>
                   <ul className="space-y-2 text-gray-700 bg-gray-50 p-4 rounded-xl">
                     <li className="flex items-start"><span className="text-blue-500 mr-2">•</span>Bicara lembut (Kol 4:6).</li>
                     <li className="flex items-start"><span className="text-blue-500 mr-2">•</span>Jaga kerahasiaan doa.</li>
                     <li className="flex items-start"><span className="text-blue-500 mr-2">•</span>Bijak bermedsos.</li>
                     <li className="flex items-start"><span className="text-blue-500 mr-2">•</span>Cepat mendengar, lambat bicara.</li>
                   </ul>
                 </div>
               </div>
             </ContentCard>

             <ContentCard>
               <SectionTitle>Materi Pengajaran</SectionTitle>
               <p className="text-gray-600 mb-4">Sumber materi yang bisa digunakan Sintua:</p>
               <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['Tema Tahunan', 'Sub Tema', 'Renungan Harian', 'Materi Sinode'].map((tag) => (
                     <div key={tag} className="px-3 py-2 bg-blue-50 text-blue-800 rounded-lg text-center text-sm font-bold border border-blue-100">
                       {tag}
                     </div>
                   ))}
               </div>
             </ContentCard>
          </div>
        )}

        {/* VIEW: LAPORAN */}
        {activeTab === 'laporan' && (
          <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
            
            {/* INPUT FORM */}
            <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg border-t-4 border-green-500 mb-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">Form Laporan Digital</h2>
                  <p className="text-gray-500 text-sm">Isi data di bawah ini, lalu simpan ke Cloud atau salin ke WA.</p>
                </div>
                <div className="flex space-x-2">
                   {isSaving ? (
                     <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                       <RefreshCw size={12} className="mr-1 animate-spin"/> Menyimpan...
                     </span>
                   ) : (
                     <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                       <Check size={12} className="mr-1"/> Siap
                     </span>
                   )}
                </div>
              </div>
              
              <form className="space-y-6">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-sm text-blue-800 mb-4">
                  <Info size={16} className="inline mr-2 -mt-1"/>
                  <strong>Info Sinkronisasi:</strong> Pastikan penulisan <strong>Nama Sintua</strong> konsisten (huruf besar/kecil sama) agar riwayat muncul di HP & Laptop.
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">a. Nama Sintua (Wajib)</label>
                    <div className="relative">
                      <User className="absolute top-3 left-3 text-gray-400" size={18}/>
                      <input 
                        type="text" 
                        name="namaSintua" 
                        value={laporan.namaSintua}
                        onChange={handleInputChange}
                        placeholder="Contoh: St. Sibujur Uhur Saragih"
                        className="w-full pl-10 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-semibold text-blue-900"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">c. Tanggal Pelaksanaan</label>
                     <div className="relative">
                      <Calendar className="absolute top-3 left-3 text-gray-400" size={18}/>
                      <input 
                        type="date" 
                        name="tanggal" 
                        value={laporan.tanggal}
                        onChange={handleInputChange}
                        className="w-full pl-10 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">b. Daftar Keluarga Binaan</label>
                  <textarea 
                    name="jumatanganan" 
                    value={laporan.jumatanganan}
                    onChange={handleInputChange}
                    rows="3"
                    placeholder="1. Kel. Bp...&#10;2. Kel. Bp...&#10;3. Kel. Bp..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">d. Tuan Rumah</label>
                  <input 
                    type="text" 
                    name="tuanRumah" 
                    value={laporan.tuanRumah}
                    onChange={handleInputChange}
                    placeholder="Kel. Bp. Siboan..."
                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                  <label className="block text-sm font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">e. Jumlah Kehadiran (Jiwa)</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <span className="text-xs font-semibold text-gray-500 block mb-1">Bapa</span>
                      <input type="number" name="hadirBapa" value={laporan.hadirBapa} placeholder="0" onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                       <span className="text-xs font-semibold text-gray-500 block mb-1">Inang</span>
                      <input type="number" name="hadirInang" value={laporan.hadirInang} placeholder="0" onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                       <span className="text-xs font-semibold text-gray-500 block mb-1">Namaposo</span>
                      <input type="number" name="hadirNaposo" value={laporan.hadirNaposo} placeholder="0" onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 outline-none" />
                    </div>
                    <div>
                       <span className="text-xs font-semibold text-gray-500 block mb-1">ASM</span>
                      <input type="number" name="hadirASM" value={laporan.hadirASM} placeholder="0" onChange={handleInputChange} className="w-full p-2 border border-gray-300 rounded focus:border-blue-500 outline-none" />
                    </div>
                  </div>
                </div>

                <div>
                   <label className="block text-sm font-semibold text-gray-700 mb-2">f. Pokok Doa</label>
                   <textarea name="pokokDoa" value={laporan.pokokDoa} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg h-24 text-sm focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Tuliskan pokok doa yang didoakan..."></textarea>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">g. Galangan (Rp)</label>
                    <div className="relative">
                      <span className="absolute top-2.5 left-3 text-gray-500 font-bold">Rp</span>
                      <input type="number" name="persembahan" value={laporan.persembahan} onChange={handleInputChange} className="w-full pl-10 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="50000" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">h. Tema Renungan</label>
                    <input type="text" name="tema" value={laporan.tema} onChange={handleInputChange} className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Judul renungan..." />
                  </div>
                </div>

                 <div>
                   <label className="block text-sm font-semibold text-red-700 mb-2">i. Catatan Khusus (Pastoral)</label>
                   <textarea name="catatan" value={laporan.catatan} onChange={handleInputChange} className="w-full p-3 border border-red-200 bg-red-50 rounded-lg h-24 text-sm focus:ring-2 focus:ring-red-500 outline-none placeholder-red-300" placeholder="KDRT, Sakit keras, dll (Bersifat Rahasia - Hanya untuk PMJ)"></textarea>
                </div>
              </form>
              
              <div className="mt-8 pt-6 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={saveToCloud}
                  disabled={isSaving}
                  className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center space-x-2 transition-all shadow-lg bg-gradient-to-r from-blue-600 to-blue-800 text-white hover:shadow-xl hover:-translate-y-1 disabled:opacity-50"
                >
                  <Cloud size={24} />
                  <span>{isSaving ? "Menyimpan..." : "Simpan ke Cloud"}</span>
                </button>

                <button 
                  onClick={() => copyToClipboard(laporan)}
                  className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center space-x-2 transition-all shadow-lg border-2 border-blue-800 ${
                    showCopySuccess 
                      ? 'bg-green-600 text-white border-green-600' 
                      : 'bg-white text-blue-800 hover:bg-blue-50'
                  }`}
                >
                  {showCopySuccess ? (
                     <>
                       <Check size={24} />
                       <span>Tersalin!</span>
                     </>
                  ) : (
                    <>
                      <Copy size={24} />
                      <span>Salin Text (WA)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* RIWAYAT LAPORAN */}
            {laporan.namaSintua && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="text-xl font-bold text-gray-800 flex items-center">
                  <RefreshCw className="mr-2" size={20}/> Riwayat Laporan: {laporan.namaSintua}
                </h3>
                
                {myReports.length === 0 ? (
                  <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-500">
                    Belum ada riwayat laporan untuk nama ini. <br/>
                    Klik "Simpan ke Cloud" setelah mengisi form.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {myReports.map((item) => (
                      <div key={item.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:border-blue-300 transition-all group relative">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded">{item.tanggal}</span>
                            <h4 className="font-bold text-gray-800 mt-2">{item.tuanRumah}</h4>
                            <p className="text-sm text-gray-600">Jumatanganan: {item.jumatanganan}</p>
                          </div>
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => loadReport(item)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg tooltip"
                              title="Edit/Lihat Kembali"
                            >
                              <FileText size={18}/>
                            </button>
                            <button 
                              onClick={() => copyToClipboard(item)}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg tooltip"
                              title="Salin ke WA"
                            >
                              <Copy size={18}/>
                            </button>
                            <button 
                              onClick={() => deleteReport(item.id)}
                              className="p-2 text-red-400 hover:bg-red-50 rounded-lg hover:text-red-600"
                              title="Hapus"
                            >
                              <Trash2 size={18}/>
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 flex justify-between">
                          <span>Galangan: Rp {item.persembahan}</span>
                          <span>Hadir: {parseInt(item.hadirBapa||0)+parseInt(item.hadirInang||0)+parseInt(item.hadirNaposo||0)+parseInt(item.hadirASM||0)} jiwa</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </main>
      
      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 z-40 pb-safe shadow-[0_-5px_10px_rgba(0,0,0,0.05)]">
         <button onClick={() => {setActiveTab('home'); setIsMobileMenuOpen(false)}} className={`p-2 rounded-xl flex flex-col items-center w-16 transition-all ${activeTab === 'home' ? 'text-blue-700 bg-blue-50' : 'text-gray-400'}`}>
           <Home size={22} strokeWidth={activeTab === 'home' ? 2.5 : 2} />
           <span className="text-[10px] mt-1 font-medium">Beranda</span>
         </button>
         <button onClick={() => {setActiveTab('tataibadah'); setIsMobileMenuOpen(false)}} className={`p-2 rounded-xl flex flex-col items-center w-16 transition-all ${activeTab === 'tataibadah' ? 'text-blue-700 bg-blue-50' : 'text-gray-400'}`}>
           <Heart size={22} strokeWidth={activeTab === 'tataibadah' ? 2.5 : 2} />
           <span className="text-[10px] mt-1 font-medium">Ibadah</span>
         </button>
         <button onClick={() => {setActiveTab('laporan'); setIsMobileMenuOpen(false)}} className={`p-2 rounded-xl flex flex-col items-center w-16 transition-all ${activeTab === 'laporan' ? 'text-blue-700 bg-blue-50' : 'text-gray-400'}`}>
           <FileText size={22} strokeWidth={activeTab === 'laporan' ? 2.5 : 2} />
           <span className="text-[10px] mt-1 font-medium">Laporan</span>
         </button>
         <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className={`p-2 rounded-xl flex flex-col items-center w-16 transition-all ${isMobileMenuOpen ? 'text-blue-700 bg-blue-50' : 'text-gray-400'}`}>
           <BookOpen size={22} />
           <span className="text-[10px] mt-1 font-medium">Menu</span>
         </button>
      </nav>

      {/* Styles for animation & safe area */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes bounce-up {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out forwards;
        }
        .animate-bounce-up {
          animation: bounce-up 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        .pb-safe {
          padding-bottom: env(safe-area-inset-bottom, 20px);
        }
      `}</style>
    </div>
  );
};

export default App;