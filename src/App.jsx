import { supabase } from "./supabase";
import { useState, useEffect } from "react";
import "./App.css";
import { tyreData } from "./tyreData";
import { vehicleData } from "./vehicleData";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(true);

  // Customer / admin / contact actions
  const [showCustomerLogin, setShowCustomerLogin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [contactAction, setContactAction] = useState(null);
  const [customerLoggedIn, setCustomerLoggedIn] = useState(false);
  const [adminLoggedIn, setAdminLoggedIn] = useState(false);
  const [customerLogin, setCustomerLogin] = useState({
    name: "",
    email: "",
    phone: "",
    password: ""
  });
  const [adminLogin, setAdminLogin] = useState({
    name: "",
    password: ""
  });
  const [chatOpen, setChatOpen] = useState(false);
  const [tyreFinderMode, setTyreFinderMode] = useState("size");
const [chatInput, setChatInput] = useState("");
const [chatMessages, setChatMessages] = useState([
  {
    role: "assistant",
    text: "Hi! 👋 I'm Kedar Tyres Assistant. I can help you find tyres, understand tyre sizes, and answer questions about Kedar Tyres."
  }
]);
const [chatLoading, setChatLoading] = useState(false);
  const sendChatMessage = async () => {
  const message = chatInput.trim();

  if (!message || chatLoading) return;

  setChatMessages((current) => [
    ...current,
    {
      role: "user",
      text: message
    }
  ]);

  setChatInput("");
  setChatLoading(true);

  try {
    const { data, error } = await supabase.functions.invoke(
      "rapid-action",
      {
        body: {
          message
        }
      }
    );

    if (error) {
  console.error("Supabase chat error:", error);
  throw error;
}

    setChatMessages((current) => [
      ...current,
      {
        role: "assistant",
        text:
          data?.reply ||
          "Sorry, I couldn't come up with a response."
      }
    ]);
  } catch (error) {
  console.error("FULL CHAT ERROR:", error);
  console.error("Error message:", error?.message);
  console.error("Error context:", error?.context);

  setChatMessages((current) => [
    ...current,
    {
      role: "assistant",
      text: `Chat error: ${error?.message || "Unknown error"}`
    }
  ]);
} finally {
  setChatLoading(false);
}
};
  const [adminMessage, setAdminMessage] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [newTyre, setNewTyre] = useState({
    size: "",
    brand: "",
    image: "/tyre1.png"
  });
  const [catalogueTyres, setCatalogueTyres] = useState(() => {
    try {
      const saved = localStorage.getItem("kedarTyresCatalogue");
      return saved ? JSON.parse(saved) : tyreData;
    } catch {
      return tyreData;
    }
  });

  // Search
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchType, setSearchType] = useState(null);

  // Tyre search
  const [tyreSize, setTyreSize] = useState("");
  const [showTyreResults, setShowTyreResults] = useState(false);
  const [selectedTyre, setSelectedTyre] = useState(null);
  const [favouriteTyres, setFavouriteTyres] = useState(() => {
  const saved = localStorage.getItem("favouriteTyres");
  return saved ? JSON.parse(saved) : [];
});
  // Vehicle search
  const [vehicleBrand, setVehicleBrand] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleResults, setVehicleResults] = useState([]);

  // Tyre guide
  const [showTyreGuide, setShowTyreGuide] = useState(false);
  const [activeReview, setActiveReview] = useState(0);

  // Product pages
  const [showProductPage, setShowProductPage] = useState(null);
  const [showServicesPage, setShowServicesPage] = useState(false);

  const contactOwner = (action = "whatsapp") => {
    if (customerLoggedIn) {
      if (action === "call") {
        window.location.href = "tel:+919404522221";
      } else {
        window.open("https://wa.me/919404522221", "_blank", "noopener,noreferrer");
      }
      return;
    }
    setContactAction(action);
    setLoginMessage("");
    setShowCustomerLogin(true);
  };

  useEffect(() => {
  let mounted = true;

  const restoreSession = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      if (!session?.user) {
        setCustomerLoggedIn(false);
        setAdminLoggedIn(false);
        setShowAdminPanel(false);
        return;
      }

      const { data: adminData, error: adminError } = await supabase
        .from("admins")
        .select("id, name")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!mounted) return;

      if (!adminError && adminData) {
        setAdminLoggedIn(true);
        setCustomerLoggedIn(false);
      } else {
        setAdminLoggedIn(false);
        setCustomerLoggedIn(true);
        setShowAdminPanel(false);
      }
    } catch (error) {
      console.error("Session restore error:", error);
    }
  };

  restoreSession();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(() => {
    restoreSession();
  });

  return () => {
    mounted = false;
    subscription.unsubscribe();
  };
}, []);

  const completeCustomerLogin = async () => {
  const { name, email, phone, password } = customerLogin;

  if (!name.trim() || !email.trim() || !phone.trim() || !password.trim()) {
    setLoginMessage("Please fill in all fields.");
    return;
  }

  if (password.length < 8) {
    setLoginMessage("Password must be at least 8 characters.");
    return;
  }

  setLoginLoading(true);
  setLoginMessage("");

  try {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    // First try to log in an existing customer
    const { data: loginData, error: loginError } =
      await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

    if (!loginError && loginData.user) {
      setLoginMessage("✓ Login successful!");
      setCustomerLoggedIn(true);
      setLoginLoading(false);

      setTimeout(() => {
        setShowCustomerLogin(false);

        if (contactAction === "call") {
          window.location.href = "tel:+919404522221";
        } else if (contactAction === "whatsapp") {
          window.open(
            "https://wa.me/919404522221",
            "_blank",
            "noopener,noreferrer"
          );
        }

        setContactAction(null);
        setCustomerLogin({
          name: "",
          email: "",
          phone: "",
          password: "",
        });
        setLoginMessage("");
      }, 1200);

      return;
    }

    // If login failed, try creating a new Supabase account
    const { data: signupData, error: signupError } =
  await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      data: {
        name: cleanName,
        phone: cleanPhone,
      },
    },
  });

    if (signupError) {
      setLoginMessage(
        signupError.message.includes("already registered")
          ? "Incorrect email or password."
          : signupError.message
      );
      setLoginLoading(false);
      return;
    }

    if (!signupData.user) {
      setLoginMessage("Unable to create your account. Please try again.");
      setLoginLoading(false);
      return;
    }

    // Create the customer's profile in the customers table
    
    // Supabase may require email confirmation before creating a session
    if (!signupData.session) {
      setLoginMessage(
        "Account created! Please verify your email, then sign in."
      );
      setLoginLoading(false);
      return;
    }

    setLoginMessage("✓ Login successful!");
    setCustomerLoggedIn(true);
    setLoginLoading(false);

    setTimeout(() => {
      setShowCustomerLogin(false);

      if (contactAction === "call") {
        window.location.href = "tel:+919404522221";
      } else if (contactAction === "whatsapp") {
        window.open(
          "https://wa.me/919404522221",
          "_blank",
          "noopener,noreferrer"
        );
      }

      setContactAction(null);
      setCustomerLogin({
        name: "",
        email: "",
        phone: "",
        password: "",
      });
      setLoginMessage("");
    }, 1200);
  } catch (error) {
    console.error("Customer login error:", error);
    setLoginMessage("Unable to connect to Supabase. Please try again.");
    setLoginLoading(false);
  }
};

  const toggleFavourite = (id) => {
  setFavouriteTyres((current) => {
    const updated = current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id];

    localStorage.setItem("favouriteTyres", JSON.stringify(updated));

    return updated;
  });
};

const isTyreFavourite = (id) =>
  favouriteTyres.includes(id);
  const getTyreImage = (tyre, index = 0) =>
    tyre?.image || `/tyre${(index % 4) + 1}.png`;

  const openSearch = () => {
  setSearchOpen(true);
  setSearchType(null);
  setShowTyreGuide(false);
  setShowTyreResults(false);
  setTyreSize("");

  // Reset vehicle search
  setVehicleBrand("");
  setVehicleModel("");
  setVehicleResults([]);
};

  const closeSearch = () => {
  setSearchOpen(false);
  setSearchType(null);
  setShowTyreGuide(false);
  setShowTyreResults(false);
  setTyreSize("");

  // Reset vehicle search
  setVehicleBrand("");
  setVehicleModel("");
  setVehicleResults([]);
};

  const selectTyres = () => {
    setSearchType("tyres");
  };

  const selectVehicle = () => {
    setSearchType("vehicle");
  };

  const vehicleBrands = [
  ...new Set(vehicleData.map((vehicle) => vehicle.manufacturer))
];

const vehicleModels = vehicleBrand
  ? [
      ...new Set(
        vehicleData
          .filter(
            (vehicle) =>
              vehicle.manufacturer.toUpperCase() ===
              vehicleBrand.toUpperCase()
          )
          .map((vehicle) => vehicle.model)
      ),
    ]
  : [];

// Build one card for each individual FRONT/REAR size.
// A slash means multiple sizes in the same position, not FRONT + REAR.
// Example: "2.75-17/2.75-18" becomes two separate FRONT cards.
const getVehicleTyrePositions = (vehicle) => {
  const positions = [];

  const splitSizes = (value) =>
    String(value || "")
      .split("/")
      .map((size) => size.trim())
      .filter(Boolean);

  splitSizes(vehicle.front).forEach((size) => {
    if (size.toUpperCase() !== "SAME") {
      positions.push({
        position: "FRONT",
        size,
      });
    }
  });

  splitSizes(vehicle.rear).forEach((size) => {
    if (size.toUpperCase() !== "SAME") {
      positions.push({
        position: "REAR",
        size,
      });
    }
  });

  return positions;
};

const catalogueVehicleTyres = vehicleData.flatMap((vehicle, vehicleIndex) => {
  const positions = getVehicleTyrePositions(vehicle);

  return positions.map((tyre, positionIndex) => {
    const imageKey =
      `${vehicle.manufacturer}-${vehicle.model}-${tyre.position}`
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "-")
        .replace(/[^A-Z0-9-]/g, "");

    return {
      id: `${vehicle.manufacturer}-${vehicle.model}-${tyre.position}-${vehicleIndex}-${positionIndex}`,
      manufacturer: vehicle.manufacturer,
      model: vehicle.model.trim(),
      position: tyre.position,
      size: tyre.size,
      imageKey,
    };
  });
});

const googleReviews = [
  {
    name: "Marin",
    rating: 5,
    date: "a year ago",
    text: "Had a great experience at this tyre shop! The staff was knowledgeable, professional, and very helpful in guiding me to the right tyres for my vehicle. The service was quick, and they handled everything with care and precision. Prices were reasonable and transparent—no hidden charges. They even checked wheel alignment and gave maintenance tips. Highly recommend this place if you're looking for reliable and honest service!"
  },
  {
    name: "Ashitosh Dighe",
    rating: 5,
    date: "6 months ago",
    text: "Back to 20years we are coming here and exchanging our tyres and repairing and they are giving us a good response in their work and they are giving good service"
  },
  {
    name: "Lonely Budhha",
    rating: 5,
    date: "6 months ago",
    text: "Best quality puncture shop in pune"
  },
  {
    name: "Yogesh Naik (Yogi)",
    rating: 5,
    date: "3 months ago",
    text: "I like his home service facility. Thank you Anna 👍🙏🙏"
  },
  {
    name: "kaushik Shendye",
    rating: 5,
    date: "a month ago",
    text: "Excellent work, reasonable price."
  },
  {
    name: "Kedar Joshi",
    rating: 5,
    date: "3 years ago",
    text: "Very reliable place for all you require for your tyres, right from nitrogen, air and puncture. They also have good and branded stock of tyres to be replaced."
  },
  {
    name: "S R Hagawane",
    rating: 5,
    date: "2 years ago",
    text: "Tyre repairing and servicing is very good. The work they do is accurate and honest.... Nice 👍"
  },
  {
    name: "Kedar Joshi",
    rating: 5,
    date: "3 years ago",
    text: "Very reliable place for checking tyre pressure and tyre changes too. Staff and owner are very cooperative."
  },
  {
    name: "Bytoc Gaming",
    rating: 5,
    date: "a year ago",
    text: "Very Good shop for tires and prices aren't high."
  },
  {
    name: "Amrin Nimeson",
    rating: 5,
    date: "a year ago",
    text: "A dependable shop, and a helpful owner. I will recommend it."
  },
  {
    name: "Vinay Joshi",
    rating: 5,
    date: "8 years ago",
    text: "Nice small Tyre showroom on sinhgad road with high tech instruments and trained labour"
  },
  {
    name: "Mahender Singh",
    rating: 5,
    date: "8 years ago",
    text: "Great stock available. Very professional and knowledgeable owner. Great experience."
  },
  {
    name: "Sudarshan",
    rating: 5,
    date: "7 years ago",
    text: "Excellent service and reasonable prices"
  },
  {
    name: "Sagir Sagir",
    rating: 5,
    date: "a year ago",
    text: "Small shop perfect work"
  },
  {
    name: "Ayan Torvi",
    rating: 5,
    date: "2 years ago",
    text: "Quality tyre repairing work"
  },
  {
    name: "Mayur Danekar",
    rating: 5,
    date: "6 years ago",
    text: "You can trust them"
  },
  {
    name: "Amit Salunkhe",
    rating: 5,
    date: "7 years ago",
    text: "Excellent service."
  }
];

useEffect(() => {
  if (window.location.hash === "#admin") {
    setShowAdminLogin(true);
  }
}, []);

useEffect(() => {
  try {
    localStorage.setItem("kedarTyresCatalogue", JSON.stringify(catalogueTyres));
  } catch {
    // Keep the catalogue working even when browser storage is unavailable.
  }
}, [catalogueTyres]);

useEffect(() => {
  const timer = setInterval(() => {
    setActiveReview((current) =>
      (current + 1) % googleReviews.length
    );
  }, 4000);

  return () => clearInterval(timer);
}, []);

const searchVehicle = () => {
  if (!vehicleBrand || !vehicleModel) return;

  const selectedBrand = vehicleBrand.trim().toUpperCase();
  const selectedModel = vehicleModel.trim().toUpperCase();

  const matches = vehicleData.filter((vehicle) => {
    const dataBrand = String(vehicle.manufacturer)
      .trim()
      .toUpperCase();

    const dataModel = String(vehicle.model)
      .trim()
      .toUpperCase();

    return (
      dataBrand === selectedBrand &&
      dataModel === selectedModel
    );
  });

  console.log("Selected vehicle:", selectedBrand, selectedModel);
  console.log("Matches:", matches);

  if (matches.length === 0) {
    console.log("No vehicle found");
    return;
  }

  setVehicleResults(matches);
  setSearchOpen(false);
  setSearchType(null);
};

  return (
    <div className="app">
      
      {/* =====================================================
    KEDAR AI ASSISTANT
===================================================== */}

<div className="kedar-chatbot">

  {/* CHAT WINDOW */}
  {chatOpen && (
    <div className="kedar-chat-window">

      <div className="kedar-chat-header">
        <div>
          <strong>Kedar Assistant</strong>
          <span>Tyre & vehicle help</span>
        </div>

        <button
          className="kedar-chat-close"
          onClick={() => setChatOpen(false)}
          aria-label="Close chat"
        >
          ×
        </button>
      </div>


      <div className="kedar-chat-messages">

        {chatMessages.map((message, index) => (
          <div
            key={index}
            className={`kedar-chat-message ${
              message.role === "user"
                ? "user"
                : "assistant"
            }`}
          >
            {message.text}
          </div>
        ))}

        {chatLoading && (
          <div className="kedar-chat-message assistant">
            <span className="kedar-chat-typing">
              <i></i>
              <i></i>
              <i></i>
            </span>
          </div>
        )}

      </div>


      <div className="kedar-chat-input-area">

        <input
          type="text"
          value={chatInput}
          onChange={(e) =>
            setChatInput(e.target.value)
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              sendChatMessage();
            }
          }}
          placeholder="Ask about tyres..."
          disabled={chatLoading}
        />

        <button
          onClick={sendChatMessage}
          disabled={
            chatLoading ||
            !chatInput.trim()
          }
          aria-label="Send message"
        >
          ➤
        </button>

      </div>

    </div>
  )}


  {/* FLOATING BUTTON */}
  {!chatOpen && (
    <button
      className="kedar-chat-button"
      onClick={() => setChatOpen(true)}
      aria-label="Open Kedar Assistant"
    >
      <span>✦</span>
    </button>
  )}

</div>

      {/* =====================================================
    NAVBAR
===================================================== */}

<header className="main-header">

  {/* CENTRE LOGO */}
  <div className="logo-section">
    <img
      src={`${import.meta.env.BASE_URL}logo.png`}
      alt="Kedar Tyres"
      className="brand-logo"
    />
  </div>

  {/* RIGHT SIDE — ONLY HAMBURGER */}
  <nav className="navbar-actions">

    <button
      className="nav-icon menu-icon"
      onClick={() => setMenuOpen(prev => !prev)}
      aria-label={menuOpen ? "Close menu" : "Open menu"}
    >
      <span></span>
      <span></span>
      <span></span>
    </button>

  </nav>

</header>


      {/* =====================================================
          HAMBURGER MENU
      ===================================================== */}

      {menuOpen && (
  <div
    className="menu-overlay"
    onClick={() => setMenuOpen(false)}
  >
    <div
      className="side-menu"
      onClick={(e) => e.stopPropagation()}
    >

      <button
        className="close-menu"
        onClick={() => setMenuOpen(false)}
      >
        ×
      </button>

      <h2>Kedar Tyres</h2>

      {/* TYRES */}
      <button
        className="side-menu-link"
        onClick={() => {
          setMenuOpen(false);
          setShowProductPage("tyres");
        }}
      >
        Tyres
      </button>

      {/* SERVICES */}
      <button
        className="side-menu-link"
        onClick={() => {
          setMenuOpen(false);

          setTimeout(() => {
            document
              .getElementById("services")
              ?.scrollIntoView({
                behavior: "smooth",
                block: "start"
              });
          }, 100);
        }}
      >
        Services
      </button>

      {/* WHY US */}
      <a
        href="#why-us"
        onClick={() => setMenuOpen(false)}
      >
        Why Us
      </a>

      {/* CONTACT */}
      <a
        href="#contact"
        onClick={() => setMenuOpen(false)}
      >
        Contact Us
      </a>

      {/* LIKED TYRES */}
<button
  className="side-menu-link menu-account-link"
  onClick={() => {
    setMenuOpen(false);
    setShowProductPage("favourites");
  }}
>
  <span className="menu-link-icon">♡</span>
  <span>Liked Tyres</span>
</button>

{/* LOGIN */}
<button
  className="side-menu-link menu-account-link"
  onClick={() => {
    setMenuOpen(false);
    setShowCustomerLogin(true);
  }}
>
  <span className="menu-link-icon">♙</span>
  <span>Login</span>
</button>

      {/* ADMIN CATALOGUE */}
      {adminLoggedIn && (
        <button
          className="side-menu-link"
          onClick={() => {
            setMenuOpen(false);
            setShowAdminPanel(true);
          }}
        >
          🔐 Admin Catalogue
        </button>
      )}

    </div>
  </div>
)}


      {/* =====================================================
          MAIN WEBSITE
      ===================================================== */}

      {!showTyreResults && (
        <main>

        {/* =====================================================
            HERO
        ===================================================== */}

        <section className="hero">

          <div className="shop-image">
            <img
              src={`${import.meta.env.BASE_URL}shop.png`}
              alt="Kedar Tyres shop"
            />
          </div>

          <div className="shop-info">

            <p className="hero-label">
              KEDAR TYRES
            </p>

            <h1>
              Your journey starts
              <br />
              with the right tyres.
            </h1>

            <p className="hero-description">
              Quality tyres, reliable service and everything
              you need to keep your journey moving.
            </p>

            <div className="hero-buttons">

              <button
                className="primary-button"
                onClick={openSearch}
              >
                Explore Tyres
              </button>

              <a
  className="secondary-button"
  href="https://www.google.com/maps/dir//Kedar+Tyres,+sinhagad+road+near+rajaram+bridge.opp+vithalmandir+caman,+Vitthalwadi,+Hingne+Khurd,+Pune,+Maharashtra+411051/@19.7959616,75.2496241,12z/data=!4m8!4m7!1m0!1m5!1m1!1s0x3bc2bf652f1b8539:0x34979c006825cdbe!2m2!1d73.8280501!2d18.4843364?entry=ttu&g_ep=EgoyMDI2MDgxMi4wIKXMDSoASAFQAw%3D%3D"
  target="_blank"
  rel="noopener noreferrer"
>
  📍 Find Our Store
</a>

            </div>

          </div>

        </section>


        {/* =====================================================
            PRODUCTS
        ===================================================== */}

        <section
          className="product-showcase"
          id="products"
        >

          {/* TYRES */}

          <div className="product-section">

            <div className="product-section-header">

              <button
                className="product-section-title"
                onClick={() => setShowProductPage("tyres")}
              >
                Tyres
                <span>→</span>
              </button>

              <p>
                Explore tyres for your vehicle
              </p>

            </div>

            <div className="product-scroll">

              {catalogueTyres.slice(0, 4).map((tyre, index) => (
                <button
                  className="product-card home-tyre-card"
                  key={`home-${tyre.size}-${index}`}
                  onClick={() => setShowProductPage("tyres")}
                >
                  <img
                    src="/kedar-tyres/images/tyre-default.webp"
                    alt="Tyre"
                  />
                  <div className="home-tyre-info">
                    <strong>{tyre.size}</strong>
                    <span>{tyre.brands?.slice(0, 2).join(" · ")}</span>
                  </div>
                </button>
              ))}

            </div>

          </div>

        </section>

        {/* =====================================================
    TYRE ROAD TRANSITION
===================================================== */}

<section className="tyre-road-transition">

  <div className="road-content">

    <div className="rolling-tyre">

      <div className="tyre-wheel">

        <div className="tyre-sidewall">

          <div className="tyre-rim">

            <div className="rim-center"></div>

            <span className="rim-spoke spoke-1"></span>
            <span className="rim-spoke spoke-2"></span>
            <span className="rim-spoke spoke-3"></span>
            <span className="rim-spoke spoke-4"></span>
            <span className="rim-spoke spoke-5"></span>

          </div>

        </div>

      </div>

    </div>

  </div>

  <div className="road-line"></div>

</section>

        {/* =====================================================
            SERVICES + TRUST POINTS
        ===================================================== */}

        <section className="services-section" id="services">

  <div className="services-inner">

    <div className="services-layout">

      {/* SERVICES */}

      <div className="services-panel">

        <div className="services-header">

          <div className="section-eyebrow">
            <h1>WHAT WE DO</h1>
          </div>

          <h2>
            Complete tyre care,
            under one roof.
          </h2>

          <p>
            <h3>From fitting and repairs to wheel care and maintenance,
            we help keep your vehicle safe and road-ready.</h3>
          </p>

        </div>


        <div className="services-grid">

          {/* SERVICE 1 */}

          <div className="service-card">

            <span className="service-number">
              01
            </span>

            <div className="service-icon">
              🛠️
            </div>

            <div className="service-content">
              <h3>PUNCTURE FIXING</h3>

            </div>

            <span className="service-arrow">
              →
            </span>

          </div>


          {/* SERVICE 2 */}

          <div className="service-card">

            <span className="service-number">
              02
            </span>

            <div className="service-icon">
              💨
            </div>

            <div className="service-content">
              <h3>TYRE AIR FILLING</h3>

            </div>

            <span className="service-arrow">
              →
            </span>

          </div>


          {/* SERVICE 3 */}

          <div className="service-card">

            <span className="service-number">
              03
            </span>

            <div className="service-icon">
              ⚙
            </div>

            <div className="service-content">
              <h3>TYRE, TUBE SALE</h3>

            </div>

            <span className="service-arrow">
              →
            </span>

          </div>


          {/* SERVICE 4 */}

          <div className="service-card">

            <span className="service-number">
              04
            </span>

            <div className="service-icon">
              ◉
            </div>

            <div className="service-content">
              <h3>WHEEL ALLIGNMENT</h3>

            </div>

            <span className="service-arrow">
              →
            </span>

          </div>


          {/* 05 */}

          <div className="service-card">
            <span className="service-number">05</span>

            <div className="service-icon">
              🔩
            </div>

            <div className="service-content">
              <h3>WHEEL BALANCING</h3>
      
            </div>

            <span className="service-arrow">→</span>
          </div>


          {/* 06 */}

          <div className="service-card">
            <span className="service-number">06</span>

            <div className="service-icon">
              🛠
            </div>

            <div className="service-content">
              <h3>TYRE ROTATION</h3>
            
            </div>

            <span className="service-arrow">→</span>
          </div>


          {/* 07 */}

          <div className="service-card">
            <span className="service-number">07</span>

            <div className="service-icon">
              ⭕
            </div>

            <div className="service-content">
              <h3>TYRE FITTING</h3>
              
            </div>

            <span className="service-arrow">→</span>
          </div>


          {/* 08 */}

          <div className="service-card">
            <span className="service-number">08</span>

            <div className="service-icon">
              📏
            </div>

            <div className="service-content">
              <h3>AIR PRESSURE CHECK</h3>
            
            </div>

            <span className="service-arrow">→</span>
          </div>

        </div>

      </div>


      {/* WHY KEDAR TYRES */}

      <div className="trust-panel" id="why-us">

        <div className="trust-header">

          <div className="section-eyebrow">
            <h1>WHY KEDAR TYRES</h1>
          </div>

          <h2>
            <h2>More than just tyres.</h2>
          </h2>

          <p>
            <h3>We focus on getting you the right product,
            the right service and a hassle-free experience.</h3>
          </p>

        </div>


        <div className="trust-grid">

          <div className="trust-item">

            <div className="trust-icon">
              ✓
            </div>

            <div>
              <h3>TRUSTED SERVICES</h3>

              <p>
                Honest guidance and dependable service for your vehicle.
              </p>
            </div>

          </div>


          <div className="trust-item">

            <div className="trust-icon">
              ★
            </div>

            <div>
              <h3>WARRANTY ASSURANCE</h3>

              <p>
                Worry not about product quality.
              </p>
            </div>

          </div>


          <div className="trust-item">

            <div className="trust-icon">
              ⚡
            </div>

            <div>
              <h3>HOME DELIVERY</h3>

              <p>
                Get products right at your doorsteps.
              </p>
            </div>

          </div>


          <div className="trust-item">

            <div className="trust-icon">
              ♢
            </div>

            <div>
              <h3>BEST PRICE</h3>

              <p>
                We take no unnecessary hidden charges.
              </p>
            </div>

          </div>

        </div>

      </div>

    </div>

  </div>

</section>

        {/* =====================================================
    GOOGLE REVIEWS
===================================================== */}

<section className="reviews-section" id="reviews">

  <div className="reviews-heading">

    <p className="section-eyebrow">
      GOOGLE REVIEWS
    </p>

    <h2>
      What our customers
      <br />
      <span>say about us.</span>
    </h2>

    <div className="reviews-overall-rating">
      <span className="overall-stars">★★★★★</span>

      <strong>5.0</strong>

      <span className="rating-label">
        Google Customer Rating
      </span>
    </div>

  </div>


  <div className="reviews-carousel">

    {googleReviews.map((review, index) => {

      const position =
        (index - activeReview + googleReviews.length)
        % googleReviews.length;

      let cardClass = "review-card review-hidden";

      if (position === 0) {
        cardClass = "review-card review-center";
      } else if (position === 1) {
        cardClass = "review-card review-right";
      } else if (
        position === googleReviews.length - 1
      ) {
        cardClass = "review-card review-left";
      }

      return (
        <article
          className={cardClass}
          key={`${review.name}-${index}`}
        >

          <div className="review-card-header">

            <div className="review-avatar">
              {review.name.charAt(0).toUpperCase()}
            </div>

            <div className="review-person">

              <h3>
                {review.name}
              </h3>

              <span>
                Google Review · {review.date}
              </span>

            </div>

          </div>


          <div className="review-stars">
            ★★★★★
          </div>


          <p className="review-text">
            {review.text}
          </p>


          <div className="review-google-label">
            <span>G</span>
            Google Review
          </div>

        </article>
      );
    })}

  </div>


  <div className="review-dots">

    {googleReviews.map((_, index) => (
      <span
        key={index}
        className={
          index === activeReview
            ? "review-dot active"
            : "review-dot"
        }
      />
    ))}

  </div>

</section>

        {/* =====================================================
    FOOTER
===================================================== */}

<footer className="site-footer" id="contact">

  <div className="footer-main">

    {/* BRAND */}

    <div className="footer-brand">

      <img
        src={`${import.meta.env.BASE_URL}logo.png`}
        alt="Kedar Tyres"
        className="footer-logo"
      />

      <p>
        Quality tyres, reliable service and trusted
        tyre care for your journey.
      </p>

      <div className="footer-social-text">
        Your trusted tyre partner.
      </div>

    </div>


    {/* CONTACT */}

    <div className="footer-column">

      <h3>Contact Us</h3>

      <button
        type="button"
        className="footer-action"
        onClick={() => contactOwner("call")}
      >
        <span className="footer-action-icon">
          ☎
        </span>

        <span>
          <strong>Call Us</strong>
          <small>94045 22221</small>
        </span>
      </button>


      <button
        type="button"
        className="footer-action"
        onClick={() => contactOwner("whatsapp")}
      >
        <span className="footer-action-icon">
          <svg viewBox="0 0 24 24">
            <path d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.6 0 .3 5.3.3 11.8c0 2.1.5 4.2 1.6 6L.2 24l6.4-1.7c1.8 1 3.6 1.5 5.5 1.5h.1c6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.3-6.2-3.5-8.5zM12.1 21.8c-1.7 0-3.4-.5-4.9-1.4l-.4-.2-3.8 1 1-3.7-.2-.4a9.8 9.8 0 1 1 8.3 4.7zm5.4-7.3c-.3-.2-1.8-.9-2.1-1-.3-.1-.5-.2-.7.2-.2.3-.8 1-1 1.2-.2.2-.4.2-.7.1-.3-.2-1.3-.5-2.5-1.6-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6.1-.1.3-.4.5-.6.2-.2.2-.3.3-.5.1-.2 0-.4 0-.6-.1-.2-.7-1.7-.9-2.3-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.1 1.1-1.1 2.7s1.1 3.1 1.3 3.3c.2.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.3-.7.3-1.3.2-1.4-.1-.1-.3-.2-.6-.3z"/>
          </svg>
        </span>

        <span>
          <strong>WhatsApp Us</strong>
          <small>Chat with us</small>
        </span>
      </button>

    </div>


    {/* VISIT */}

    <div className="footer-column">

      <h3>Visit Us</h3>

      <a
        href="https://www.google.com/maps/dir//Kedar+Tyres,+sinhagad+road+near+rajaram+bridge.opp+vithalmandir+caman,+Vitthalwadi,+Hingne+Khurd,+Pune,+Maharashtra+411051/@19.7959616,75.2496241,12z/data=!4m8!4m7!1m0!1m5!1m1!1s0x3bc2bf652f1b8539:0x34979c006825cdbe!2m2!1d73.8280501!2d18.4843364?entry=ttu&g_ep=EgoyMDI2MDgxMi4wIKXMDSoASAFQAw%3D%3D"
        target="_blank"
        rel="noopener noreferrer"
        className="footer-store-button"
      >
        📍 Find Our Store
        <span>→</span>
      </a>


      <div className="footer-hours">

        <div className="hours-icon">
          ◷
        </div>

        <div>
          <strong>Working Hours</strong>
          <span>09:00 AM – 09:00 PM</span>
        </div>

      </div>

    </div>


    {/* QUICK LINKS */}

    <div className="footer-column footer-links">

      <h3>Quick Links</h3>

      <button
        type="button"
        className="footer-link-button"
        onClick={() => setShowProductPage("tyres")}
      >
        Tyres
      </button>

      <a href="#services">
        Services
      </a>

      <a href="#reviews">
        Reviews
      </a>

      <a href="#why-us">
        Why Us
      </a>

    </div>

  </div>

{/* FOOTER BOTTOM */}

<div className="footer-bottom">

  <div className="footer-story">

    {/* ROAD */}
    <div className="footer-story-road"></div>

    {/* SMALL TYRE SHOP */}
    <div className="footer-shop">

      <div className="shop-roof"></div>

      <div className="shop-building">
        <span>KEDAR</span>
        <span>TYRES</span>
      </div>

      <div className="shop-door"></div>
      <div className="shop-window"></div>

    </div>

    {/* BIKE */}
    <div className="story-bike">

      <div className="story-bike-body"></div>
      <div className="story-bike-frame"></div>
      <div className="story-bike-seat"></div>
      <div className="story-bike-handle"></div>

      <div className="story-wheel story-wheel-back"></div>
      <div className="story-wheel story-wheel-front"></div>

    </div>

    {/* CARTOON CRASH */}
    <div className="story-crash">
      <span>✦</span>
      <span>✦</span>
      <strong>!</strong>
    </div>

    {/* DETACHED TYRE */}
    <div className="story-detached-tyre"></div>

{/* MECHANIC */}

<div className="story-mechanic">

  {/* CAP */}
  <div className="mechanic-cap">
    <div className="mechanic-cap-bill"></div>
  </div>

  {/* HEAD */}
  <div className="mechanic-head">
    <div className="mechanic-eye"></div>
    <div className="mechanic-eye mechanic-eye-second"></div>
    <div className="mechanic-smile"></div>
  </div>

  {/* NECK */}
  <div className="mechanic-neck"></div>

  {/* BODY */}
  <div className="mechanic-torso">

    <div className="mechanic-collar-left"></div>
    <div className="mechanic-collar-right"></div>

    <div className="mechanic-pocket">
      KT
    </div>

  </div>

  {/* LEFT ARM — REPAIRING */}
  <div className="mechanic-arm mechanic-arm-left">
    <div className="mechanic-glove"></div>
  </div>

  {/* RIGHT ARM — LATER WAVES */}
  <div className="mechanic-arm mechanic-arm-right">
    <div className="mechanic-glove"></div>
  </div>

  {/* WRENCH */}
  <div className="mechanic-wrench">
    🔧
  </div>

  {/* WAIST */}
  <div className="mechanic-waist"></div>

  {/* LEGS */}
  <div className="mechanic-leg mechanic-leg-left"></div>
  <div className="mechanic-leg mechanic-leg-right"></div>

  {/* BOOTS */}
  <div className="mechanic-boot mechanic-boot-left"></div>
  <div className="mechanic-boot mechanic-boot-right"></div>

</div>



  </div>

  <p>
    © 2026 Kedar Tyres. All rights reserved.
  </p>

  <span>
    Trusted tyres. Reliable service.
  </span>

</div>

</footer>

        </main>
      )}

      {/* =====================================================
          FAVOURITES PAGE
      ===================================================== */}

      {showProductPage === "favourites" && (
        <div className="product-page favourites-page">
          <div className="product-page-inner">
            <div className="product-page-header">
              <div>
                <p className="section-eyebrow">YOUR SAVED TYRES</p>
                <h1>Tyres you <span>liked.</span></h1>
                <p>Save tyres here and come back to them whenever you need.</p>
              </div>
              <button
                className="product-back-button"
                onClick={() => setShowProductPage(null)}
              >
                ← Back
              </button>
            </div>

            {favouriteTyres.length === 0 ? (
              <div className="favourites-empty">
                <div className="favourites-empty-icon">♡</div>
                <h2>No saved tyres yet</h2>
                <p>Press the heart on any tyre to save it here.</p>
                <button
                  className="primary-button"
                  onClick={() => setShowProductPage("tyres")}
                >
                  Browse Tyres →
                </button>
              </div>
            ) : (
              <div className="product-page-grid">
                {favouriteTyres.map((favouriteId) => {
  const match = catalogueVehicleTyres.find(
    (tyre) => tyre.id === favouriteId
  );

  if (!match) {
    return null;
  }

  return (
    <article
      className="product-page-card"
      key={match.id}
    >
      <div className="product-page-image">
        <img
          src="/kedar-tyres/images/tyre-default.webp"
          alt={`${match.manufacturer} ${match.model} tyre`}
        />

        <button
          className="product-heart is-favourite"
          onClick={() => toggleFavourite(match.id)}
          aria-label="Remove favourite"
        >
          ♥
        </button>
      </div>

      <div className="product-page-info">
        <p className="product-page-brand">
          {match.manufacturer}
        </p>

        <h2>
          {match.model}
        </h2>

        <div className="vehicle-detail-position">
          {match.position} TYRE
        </div>

        <div className="vehicle-detail-size">
          <span>TYRE SIZE</span>
          <strong>{match.size}</strong>
        </div>

        <button
          className="product-enquire-button"
          onClick={() => contactOwner("whatsapp")}
        >
          Contact owner <span>→</span>
        </button>
      </div>
    </article>
  );
})}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================
    TYRES CATALOGUE PAGE
===================================================== */}

{showProductPage === "tyres" && (
  <div className="product-page">

    <div className="tyre-catalogue-layout">

      {/* =================================================
          LEFT TYRE FINDER
      ================================================= */}

      <aside className="tyre-finder-panel">


        <h2>
          Find your tyre here
        </h2>

        <p className="tyre-finder-description">
          Search by tyre size or select your vehicle to find
          compatible tyres.
        </p>


        {/* MODE TOGGLE */}

        <div className="tyre-finder-toggle-wrapper">

          <span className={tyreFinderMode === "size" ? "active" : ""}>
            TYRE SIZE
          </span>

          <button
            type="button"
            className={`tyre-finder-toggle ${
              tyreFinderMode === "vehicle" ? "vehicle-mode" : ""
            }`}
            onClick={() =>
              setTyreFinderMode(
                tyreFinderMode === "size"
                  ? "vehicle"
                  : "size"
              )
            }
            aria-label="Toggle tyre search method"
          >
            <span className="tyre-finder-toggle-knob"></span>
          </button>

          <span className={tyreFinderMode === "vehicle" ? "active" : ""}>
            VEHICLE
          </span>

        </div>


        {/* =================================================
            TYRE SIZE MODE
        ================================================= */}

        {tyreFinderMode === "size" && (

          <div className="tyre-finder-content">

            <p className="tyre-finder-label">
              PUT YOUR TYRE SIZE
            </p>

            <p className="tyre-finder-help">
              Enter the size written on the sidewall of your tyre.
            </p>

            <input
              className="catalogue-size-input"
              type="text"
              placeholder="e.g. 195/65 R15"
              value={tyreSize}
              onChange={(e) => setTyreSize(e.target.value)}
            />

            <button
              type="button"
              className="catalogue-search-button"
              onClick={() => {
                setSearchType("tyres");
                setSearchOpen(true);
              }}
            >
              FIND YOUR TYRE
              <span>→</span>
            </button>

            <button
              type="button"
              className="catalogue-guide-button"
              onClick={() => {
                setSearchType("tyres");
                setSearchOpen(true);
                setShowTyreGuide(true);
              }}
            >
              Don't know your tyre size?
              <span>Learn how →</span>
            </button>

          </div>

        )}


        {/* =================================================
            VEHICLE MODE
        ================================================= */}

        {tyreFinderMode === "vehicle" && (

          <div className="tyre-finder-content">

            <p className="tyre-finder-label">
              PUT YOUR VEHICLE INFO
            </p>

            <p className="tyre-finder-help">
              Select your vehicle brand and model to find
              compatible tyres.
            </p>


            <label className="catalogue-field-label">
              VEHICLE BRAND
            </label>

            <select
              className="catalogue-select"
              value={vehicleBrand}
              onChange={(e) => {
                setVehicleBrand(e.target.value);
                setVehicleModel("");
                setVehicleResults([]);
              }}
            >
              <option value="">
                Select vehicle brand
              </option>

              {vehicleBrands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>


            <label className="catalogue-field-label">
              VEHICLE MODEL
            </label>

            <select
              className="catalogue-select"
              value={vehicleModel}
              onChange={(e) => {
                setVehicleModel(e.target.value);
                setVehicleResults([]);
              }}
              disabled={!vehicleBrand}
            >
              <option value="">
                {vehicleBrand
                  ? "Select vehicle model"
                  : "Select brand first"}
              </option>

              {vehicleModels.map((model, index) => (
                <option
                  key={`${model}-${index}`}
                  value={model}
                >
                  {model.trim()}
                </option>
              ))}
            </select>


            <button
              type="button"
              className="catalogue-search-button"
              onClick={() => {
                searchVehicle();
              }}
              disabled={!vehicleBrand || !vehicleModel}
            >
              FIND COMPATIBLE TYRES
              <span>→</span>
            </button>

          </div>

        )}

      </aside>


      {/* =================================================
          RIGHT CATALOGUE
      ================================================= */}

      <main className="tyre-catalogue-content">

        <div className="catalogue-content-header">

          <div>

            <p className="section-eyebrow">
              OUR CATALOGUE
            </p>

            <h1>
              Find The Right Tyre
              <br />
              <span>For Your Vehicle</span>
            </h1>

            <p>
              Explore our tyre catalogue and find the right
              size and brand for your vehicle.
            </p>

          </div>


          <button
            className="product-back-button"
            onClick={() => setShowProductPage(null)}
          >
            ← Back
          </button>

        </div>


        {/* FILTER / COUNT */}

        <div className="product-filter-bar">

          <div className="product-filter-info">

            <span className="filter-dot"></span>

            <span>
              {catalogueVehicleTyres.length} tyre options
            </span>

          </div>

          <span className="product-filter-label">
            Available at Kedar Tyres
          </span>

        </div>


        {/* EXISTING TYRE CATALOGUE */}

        <div className="product-page-grid">

          {catalogueVehicleTyres.map((tyre, index) => (

            <article
              className="product-page-card"
              key={tyre.id}
              onClick={() =>
                setSelectedTyre({
                  type: "vehicle",
                  manufacturer: tyre.manufacturer,
                  model: tyre.model,
                  position: tyre.position,
                  size: tyre.size,
                  imageKey: tyre.imageKey,
                })
              }
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {

                if (
                  e.key === "Enter" ||
                  e.key === " "
                ) {

                  e.preventDefault();

                  setSelectedTyre({
                    type: "vehicle",
                    manufacturer: tyre.manufacturer,
                    model: tyre.model,
                    position: tyre.position,
                    size: tyre.size,
                    imageKey: tyre.imageKey,
                  });

                }

              }}
            >

              <div className="product-page-image">

                <img
                  src="/kedar-tyres/images/tyre-default.webp"
                  alt="Tyre"
                />

                <button
                  className={`product-heart ${
                    isTyreFavourite(tyre.id)
                      ? "is-favourite"
                      : ""
                  }`}
                  aria-label={
                    isTyreFavourite(tyre.id)
                      ? "Remove favourite"
                      : "Favourite tyre"
                  }
                  onClick={(e) => {

                    e.stopPropagation();

                    toggleFavourite(tyre.id);

                  }}
                >
                  {isTyreFavourite(tyre.id)
                    ? "♥"
                    : "♡"}
                </button>

              </div>


              <div className="product-page-info">

                <p className="product-page-brand">
                  {tyre.manufacturer}
                </p>

                <h2>
                  {tyre.model}
                </h2>

                <div className="vehicle-detail-position">
                  {tyre.position} TYRE
                </div>

                <div className="vehicle-detail-size">

                  <span>
                    TYRE SIZE
                  </span>

                  <strong>
                    {tyre.size}
                  </strong>

                </div>

              </div>

            </article>

          ))}

        </div>


        {/* BOTTOM NOTE */}

        <div className="product-page-note">

          <span>●</span>

          Can't find your tyre?

          <button
            onClick={() => {
              setShowProductPage(null);
              openSearch();
            }}
          >
            Search by size →
          </button>

        </div>

      </main>

    </div>

  </div>
)}

      {/* =====================================================
          SEARCH MODAL
      ===================================================== */}

      {searchOpen && !showTyreGuide && !showTyreResults && (

        <div className="search-overlay">

          <div className="search-modal">

            <button
              className="search-close"
              onClick={closeSearch}
            >
              ×
            </button>


            {!searchType && (

              <>

                <p className="search-eyebrow">
                  KEDAR TYRES
                </p>

                <h2>
                  What are you looking for?
                </h2>

                <p className="search-subtitle">
                  Choose a product category to begin.
                </p>


                <div className="search-choice-grid">

                  <button
                    className="search-choice"
                    onClick={selectTyres}
                  >

                    <span className="choice-icon">
                      ◯
                    </span>

                    <span>
                      <strong>
                        Tyres
                      </strong>

                      <small>
                        Find the right tyre
                      </small>
                    </span>

                    <span className="choice-arrow">
                      →
                    </span>

                  </button>


                  <button
                    className="search-choice"
                    onClick={selectVehicle}
                  >

                    <span className="choice-icon tube-icon">
                      🚗
                    </span>

                    <span>
                      <strong>
                        Search by Vehicle
                      </strong>

                      <small>
                        Find tyres for your vehicle
                      </small>
                    </span>

                    <span className="choice-arrow">
                      →
                    </span>

                  </button>

                </div>

          


    </>

            )}


            {/* =================================================
                TYRE SEARCH
            ================================================= */}

            {searchType === "tyres" && (

              <div className="tyre-start">

                <button
                  className="back-button"
                  onClick={() => setSearchType(null)}
                >
                  ←
                </button>

                <p className="search-eyebrow">
                  TYRES
                </p>

                <h2>
                  Find your tyre
                </h2>

                <p className="search-subtitle">
                  Enter the size written on the sidewall
                  of your tyre.
                </p>

                <label className="size-label">
                  Tyre size
                </label>

                <input
                  className="size-input"
                  type="text"
                  placeholder="e.g. 195/65 R15 or 2.75-17"
                  value={tyreSize}
                  onChange={(e) => setTyreSize(e.target.value)}
                />


<button
  type="button"
  className="continue-button"
  onClick={() => {
    setShowTyreResults(true);
  }}
>
  Continue
  <span>→</span>
</button>

              </div>

            )}


            {/* =================================================
                VEHICLE SEARCH
            ================================================= */}

            {searchType === "vehicle" && (

              <div className="tyre-start">

                <button
                  className="back-button"
                  onClick={() => setSearchType(null)}
                >
                  ←
                </button>

                <p className="search-eyebrow">
                  VEHICLE SEARCH
                </p>

                <h2>
                  Find tyres for your vehicle
                </h2>

                <p className="search-subtitle">
                  Select your vehicle to find compatible tyres.
                </p>

                <div className="vehicle-search-form">

  <div className="vehicle-field">
    <label>VEHICLE BRAND</label>

    <select
      value={vehicleBrand}
      onChange={(e) => {
        setVehicleBrand(e.target.value);
        setVehicleModel("");
        setVehicleResults([]);
      }}
    >
      <option value="">
        Select vehicle brand
      </option>

      {vehicleBrands.map((brand) => (
        <option key={brand} value={brand}>
          {brand}
        </option>
      ))}
    </select>
  </div>


  <div className="vehicle-field">
    <label>VEHICLE MODEL</label>

    <select
      value={vehicleModel}
      onChange={(e) => {
        setVehicleModel(e.target.value);
        setVehicleResults([]);
      }}
      disabled={!vehicleBrand}
    >
      <option value="">
        {vehicleBrand
          ? "Select vehicle model"
          : "Select brand first"}
      </option>

      {vehicleModels.map((model, index) => (
        <option
          key={`${model}-${index}`}
          value={model}
        >
          {model.trim()}
        </option>
      ))}
    </select>
  </div>


  <button
    className="vehicle-search-button"
    onClick={searchVehicle}
    disabled={!vehicleBrand || !vehicleModel}
  >
    FIND COMPATIBLE TYRES
    <span>→</span>
  </button>

</div>

              </div>

            )}

          </div>

        </div>

      )}


      {/* =====================================================
          TYRE RESULTS
      ===================================================== */}

        {selectedTyre && (
  <div
    className="tyre-detail-overlay"
    onClick={() => setSelectedTyre(null)}
  >

    <div
      className="tyre-detail-modal"
      onClick={(e) => e.stopPropagation()}
    >
      <img
  src="/kedar-tyres/images/tyre-default.webp"
  alt="Tyre"
  className="tyre-detail-popup-image"
/>
      {/* CLOSE */}
      <button
        className="tyre-detail-close"
        onClick={() => setSelectedTyre(null)}
        aria-label="Close tyre details"
      >
        ×
      </button>


      {/* DETAILS */}
      <div className="tyre-detail-content">
        {selectedTyre.type === "vehicle" ? (
          <>

            <p className="tyre-brand">
              {selectedTyre.manufacturer}
            </p>

            <h2>
              {selectedTyre.model}
            </h2>

            <div className="vehicle-detail-position">
              {selectedTyre.position} TYRE
            </div>

            <div className="vehicle-detail-size">

              <span>TYRE SIZE</span>

              <strong>
                {selectedTyre.size}
              </strong>

            </div>

            <p className="tyre-detail-status">
              Available
            </p>

            <p className="tyre-detail-description">
              Available in every brand.
              Please contact the owner for your preferred brand, exact size,
              tyre information, price and current availability.
            </p>

            <button
              className="contact-owner-button tyre-contact-glow"
              onClick={() => contactOwner("call")}
            >
              CONTACT OWNER →
            </button>

          </>

        ) : (

          <>

            <p className="tyre-brand">
              {selectedTyre.brand}
            </p>

            <h2>
              {selectedTyre.size}
            </h2>

            <p className="tyre-detail-status">
              Available at Kedar Tyres
            </p>

            <p className="tyre-detail-description">
              Contact the owner for the exact tyre model,
              preferred brand, price and current availability.
            </p>

            <button
              className="contact-owner-button tyre-contact-glow"
              onClick={() => contactOwner("whatsapp")}
            >
              CONTACT OWNER →
            </button>

          </>

        )}

      </div>

    </div>

  </div>
)}

      {showTyreResults && (

        <div className="tyre-results-page">
          <button
            className="results-close"
            onClick={() => {
              setShowTyreResults(false);
              setSearchOpen(false);
              setSearchType(null);
              setTyreSize("");
            }}
            aria-label="Close results"
          >
            ×
          </button>

          <main className="results-content">

            <div className="results-top">

              <div>

                <p className="results-eyebrow">
                  TYRE SEARCH
                </p>

                <h1>
                  Tyres for <span>{tyreSize}</span>
                </h1>

                <p className="results-count">
                  Showing tyres that match your search.
                </p>

              </div>


              <button
                className="change-size-button"
                onClick={() => {

                  setShowTyreResults(false);
                  setSearchOpen(true);
                  setSearchType("tyres");

                }}
              >
                Change size
              </button>

            </div>


            <div className="tyre-results-grid">

              {(() => {
                const normalizeSize = (size) =>
                  String(size || "")
                    .toUpperCase()
                    .trim()
                    .replace(/[–—−]/g, "-")
                    .replace(/\//g, "-")
                    .replace(/\s+/g, "-")
                    // Car sizes may be written as 195/65 R15;
                    // the catalogue stores the same size as 195-65-15.
                    .replace(/-R(?=\d)/g, "-")
                    .replace(/R(?=\d)/g, "")
                    .replace(/-+/g, "-")
                    .replace(/^-|-$/g, "");     

                const searchedSize = normalizeSize(tyreSize);

                const matchingEntry = catalogueTyres.find(
                  (tyre) =>
                    normalizeSize(tyre.size) === searchedSize
                );

                if (!matchingEntry) {
                  return (
                    <div className="no-tyre-found">
                      <h2>No tyre found</h2>

                      <p>
                        We couldn't find a tyre matching{" "}
                        <strong>{tyreSize}</strong>.
                      </p>

                      <p>
                        Please contact the owner for more information
                        about this tyre.
                      </p>

                      <button
                        className="contact-owner-button"
                        onClick={() => contactOwner("whatsapp")}
                      >
                        Contact Owner →
                      </button>
                    </div>
                  );
                }

                return matchingEntry.brands.map((brand, index) => {
                  const tyreId = `${brand}-${matchingEntry.size}`;
                  const isFavourite = favouriteTyres.includes(tyreId);

                  return (
                    <article
                      className="tyre-card"
                      key={tyreId}
                      onClick={() =>
                        setSelectedTyre({
                          id: tyreId,
                          brand,
                          size: matchingEntry.size
                        })
                      }
                    >
                      <div className="tyre-card-image">

                        <img
  src="/kedar-tyres/images/tyre-default.webp"
  alt="Tyre"
  className="tyre-detail-image"
/>
                        <button
                          className={`favourite-button ${
                            isFavourite ? "is-favourite" : ""
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();

                            toggleFavourite(matchingEntry, brand);
                          }}
                          aria-label={`${
                            isFavourite ? "Remove" : "Add"
                          } ${brand} ${matchingEntry.size} favourite`}
                        >
                          {isFavourite ? "♥" : "♡"}
                        </button>

                      </div>

<div className="tyre-card-info">
  <p className="tyre-brand">
    {brand}
  </p>

  <h2>
    {matchingEntry.size}
  </h2>

  <p className="tyre-availability">
    Available
  </p>
</div>
                    </article>
                  );
                });
              })()}

            </div>

          </main>

        </div>

      )}

      {vehicleResults.length > 0 && (
  <div className="vehicle-results-page">

    <header className="results-header">

  <div className="results-brand">
    KEDAR TYRES
  </div>

  <button
  className="results-close"
  onClick={() => {
    setVehicleResults([]);
    setSearchOpen(false);
    setSearchType(null);
    setVehicleBrand("");
    setVehicleModel("");
  }}
  aria-label="Exit vehicle results"
>
  ×
</button>

</header>


    <main className="results-content">

      <div className="results-top">

        <div>

          <p className="results-eyebrow">
            VEHICLE SEARCH
          </p>

          <h1>
            Tyres for{" "}
            <span>
              {vehicleBrand} {vehicleModel.trim()}
            </span>
          </h1>

          <p className="results-count">
            Compatible tyre sizes for your vehicle.
          </p>

        </div>

        <button
          className="change-size-button"
          onClick={() => {
            setVehicleResults([]);
            setSearchOpen(true);
            setSearchType("vehicle");
          }}
        >
          Change vehicle
        </button>

      </div>


      <div className="vehicle-compatible-grid">

  {vehicleResults.map((vehicle, index) => {

    const tyrePositions = getVehicleTyrePositions(vehicle);

    return tyrePositions.map((tyre, tyreIndex) => {

      const imageKey =
        `${vehicle.manufacturer}-${vehicle.model}-${tyre.position}`
          .trim()
          .toUpperCase()
          .replace(/\s+/g, "-")
          .replace(/[^A-Z0-9-]/g, "");

      return (
        <article
          className="vehicle-compatible-card"
          key={`${vehicle.manufacturer}-${vehicle.model}-${tyre.position}-${index}-${tyreIndex}`}
          onClick={() =>
            setSelectedTyre({
              type: "vehicle",
              manufacturer: vehicle.manufacturer,
              model: vehicle.model.trim(),
              position: tyre.position,
              size: tyre.size,
              imageKey: imageKey
            })
          }
        >

          {/* TYRE IMAGE */}
          <div className="vehicle-compatible-image">

            <img
              src="/kedar-tyres/images/tyre-default.webp"
              alt="Tyre"
              className="vehicle-compatible-real-image"
            />

          </div>


          {/* CARD INFORMATION */}
          <div className="vehicle-compatible-info">

            <p className="tyre-brand">
              {vehicle.manufacturer}
            </p>

            <h2>
              {vehicle.model.trim()}
            </h2>

            <div className="vehicle-card-position">
              {tyre.position} TYRE
            </div>

            <p className="vehicle-card-size">
              {tyre.size}
            </p>

            <p className="vehicle-availability">
              Available
            </p>

          </div>

        </article>
      );

    });

  })}

</div>
          
    </main>

  </div>
)}

      {/* =====================================================
          TYRE SIZE GUIDE
      ===================================================== */}

      {showTyreGuide && (

        <div className="tyre-guide-page">

          <button
            className="guide-exit"
            onClick={() => {

              setShowTyreGuide(false);
              setSearchOpen(false);
              setSearchType(null);

            }}
          >
            ×
          </button>


          <div className="guide-content">

            {/* LEFT */}

            <section className="guide-form">

              <p className="search-eyebrow">
                TYRE SEARCH
              </p>

              <h1>
                Enter your tyre size
              </h1>

              <p className="guide-description">
                Find the numbers printed on the sidewall
                of your tyre and enter them below.
              </p>


              <div className="form-fields">

                <div className="form-field">

                  <label>
                    Tyre Size
                  </label>

                  <input
                    className="size-input"
                    type="text"
                    placeholder="e.g. 195/65 R15 or 2.75-17"
                    value={tyreSize}
                    onChange={(e) => setTyreSize(e.target.value)}
                  />

                  <span>
                    Car: 195/65 R15 &nbsp; • &nbsp; Bike: 2.75-17
                  </span>

                </div>

              </div>


              <button
                className="find-button"
                type="button"
                onClick={() => {
                  setShowTyreGuide(false);
                  setSearchOpen(false);
                  setSearchType(null);
                  setShowTyreResults(true);
                }}
              >
                Find Tyres
                <span>→</span>
              </button>

            </section>


            {/* RIGHT */}

            <section className="guide-visual">

              <div className="visual-heading">

                <p>
                  HOW TO READ YOUR TYRE
                </p>

                <h2>
                  Find the size
                  <br />
                  on your tyre
                </h2>

              </div>


              <div className="tyre-image-container">

                <img
                  src={`${import.meta.env.BASE_URL}tyrecode.jfif`}
                  alt="Tyre size markings explained"
                />

              </div>


              <div className="code-explanation">

                <div>
                  <strong>195/65 R15</strong>
                  <span>Car tyre size</span>
                </div>

                <div>
                  <strong>2.75-17</strong>
                  <span>Bike tyre size</span>
                </div>

              </div>

            </section>

          </div>

        </div>

      )}

      {/* =====================================================
    SERVICES PAGE
===================================================== */}

{showServicesPage && (

  <div className="services-page">

    <button
      className="services-page-close"
      onClick={() => setShowServicesPage(false)}
    >
      ×
    </button>

    <div className="services-page-content">

      {/* HEADER */}

      <div className="services-page-header">

        <p className="section-eyebrow">
          WHAT WE DO
        </p>

        <h1>
          Everything your tyres
          <br />
          <span>need. Under one roof.</span>
        </h1>

        <p>
          From tyre fitting and repairs to professional
          wheel services, Kedar Tyres helps keep your
          vehicle ready for the road.
        </p>

      </div>


      {/* SERVICES */}

      <div className="services-page-grid">

        <article className="service-page-card">
          <span className="service-page-number">01</span>
          <div>
            <h2>Tyre Fitting</h2>
            <p>
              Professional fitting and installation for your tyres.
            </p>
          </div>
        </article>

        <article className="service-page-card">
          <span className="service-page-number">02</span>
          <div>
            <h2>Wheel Alignment</h2>
            <p>
              Keep your wheels correctly aligned for smoother driving.
            </p>
          </div>
        </article>

        <article className="service-page-card">
          <span className="service-page-number">03</span>
          <div>
            <h2>Wheel Balancing</h2>
            <p>
              Reduce vibration and help your tyres wear evenly.
            </p>
          </div>
        </article>

        <article className="service-page-card">
          <span className="service-page-number">04</span>
          <div>
            <h2>Puncture Repair</h2>
            <p>
              Quick and reliable puncture repair for suitable tyres.
            </p>
          </div>
        </article>

        <article className="service-page-card">
          <span className="service-page-number">05</span>
          <div>
            <h2>Tubeless Tyre Repair</h2>
            <p>
              Repair common tubeless punctures and air leaks.
            </p>
          </div>
        </article>

        <article className="service-page-card">
          <span className="service-page-number">06</span>
          <div>
            <h2>Tyre Rotation</h2>
            <p>
              Help maintain more even tyre wear over time.
            </p>
          </div>
        </article>

        <article className="service-page-card">
          <span className="service-page-number">07</span>
          <div>
            <h2>Tyre Pressure Check</h2>
            <p>
              Check and adjust your tyre pressure when needed.
            </p>
          </div>
        </article>

        <article className="service-page-card">
          <span className="service-page-number">08</span>
          <div>
            <h2>Tyre Inspection</h2>
            <p>
              Check tread, wear and overall tyre condition.
            </p>
          </div>
        </article>

      </div>


      {/* =================================================
          WHY KEDAR TYRES
      ================================================= */}

      <div className="why-kedar">

        <div className="why-kedar-header">
          <p className="section-eyebrow">
            WHY KEDAR TYRES
          </p>

          <h2>
            More than just tyres.
          </h2>
        </div>


        <div className="why-kedar-grid">

          <div className="why-kedar-card">
            <div className="why-kedar-icon">✓</div>

            <div>
              <h3>TRUSTED SERVICES</h3>
              <p>
                Honest guidance and dependable service for your vehicle.
              </p>
            </div>
          </div>


          <div className="why-kedar-card">
            <div className="why-kedar-icon">★</div>

            <div>
              <h3>HOME DELIVERY</h3>
              <p>
                Get products right at your doorsteps.
              </p>
            </div>
          </div>


          <div className="why-kedar-card">
            <div className="why-kedar-icon">⚙</div>

            <div>
              <h3>WARRANTY ASSURANCE</h3>
              <p>
                Worry not about product quality.
              </p>
            </div>
          </div>


          <div className="why-kedar-card">
            <div className="why-kedar-icon">◉</div>

            <div>
              <h3>BEST PRICE</h3>
              <p>
                We take no unnecessary hidden charges.
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>

  </div>

)}

      {/* =====================================================
          CUSTOMER LOGIN
      ===================================================== */}

      {showCustomerLogin && (
        <div className="login-overlay" onClick={() => setShowCustomerLogin(false)}>
          <div className="login-modal" onClick={(e) => e.stopPropagation()}>
            <button className="login-close" onClick={() => setShowCustomerLogin(false)}>×</button>
            <p className="section-eyebrow">KEDAR TYRES</p>
            <h2>Login to continue.</h2>
            <p className="login-subtitle">Please login before contacting the owner.</p>

            <input value={customerLogin.name} onChange={(e) => setCustomerLogin({ ...customerLogin, name: e.target.value })} placeholder="Full Name" />
            <input type="email" value={customerLogin.email} onChange={(e) => setCustomerLogin({ ...customerLogin, email: e.target.value })} placeholder="Email ID" />
            <input type="tel" value={customerLogin.phone} onChange={(e) => setCustomerLogin({ ...customerLogin, phone: e.target.value })} placeholder="Phone Number" />
            <input type="password" value={customerLogin.password} onChange={(e) => setCustomerLogin({ ...customerLogin, password: e.target.value })} placeholder="Password" />

            <button type="button" className="login-submit" onClick={completeCustomerLogin} disabled={loginLoading}>
              {loginLoading ? "Signing in..." : "Continue →"}
            </button>

            {loginMessage && (
              <p className={loginMessage.startsWith("✓") ? "admin-success" : "admin-error"}>
                {loginMessage}
              </p>
            )}
          </div>
        </div>
      )}

      {/* =====================================================
          ADMIN LOGIN
      ===================================================== */}

      {showAdminLogin && (
        <div className="login-overlay" onClick={() => setShowAdminLogin(false)}>
          <div className="login-modal admin-login-modal" onClick={(e) => e.stopPropagation()}>
            <button className="login-close" onClick={() => setShowAdminLogin(false)}>×</button>
            <p className="section-eyebrow">OWNER ACCESS</p>
            <h2>Admin login.</h2>
            <p className="login-subtitle">Manage the tyre catalogue from here.</p>

            <input value={adminLogin.name} onChange={(e) => setAdminLogin({ ...adminLogin, name: e.target.value })} placeholder="Admin Email" />
            <input type="password" value={adminLogin.password} onChange={(e) => setAdminLogin({ ...adminLogin, password: e.target.value })} placeholder="Admin Password" />

            <button
              className="login-submit"
              type="button"
              onClick={async () => {
  if (!adminLogin.name.trim() || !adminLogin.password) {
    setAdminMessage("Please enter the admin name and password.");
    return;
  }

  setLoginLoading(true);
  setAdminMessage("");

  try {
    const email = adminLogin.name.trim();

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password: adminLogin.password,
      });

    if (authError || !authData.user) {
      setAdminMessage("Incorrect admin name or password.");
      setLoginLoading(false);
      return;
    }

    const { data: adminData, error: adminError } =
      await supabase
        .from("admins")
        .select("id, name")
        .eq("id", authData.user.id)
        .maybeSingle();

    if (adminError || !adminData) {
      await supabase.auth.signOut();
      setAdminMessage("You do not have admin access.");
      setLoginLoading(false);
      return;
    }

    setAdminMessage("✓ Login successful!");
    setAdminLoggedIn(true);
    setLoginLoading(false);

    setTimeout(() => {
      setShowAdminLogin(false);
      setShowAdminPanel(true);
      setAdminLogin({ name: "", password: "" });
      setAdminMessage("");
    }, 900);
  } catch (error) {
    console.error("Admin login error:", error);
    setAdminMessage("Unable to connect to Supabase. Please try again.");
    setLoginLoading(false);
  }
}}
            >
              {loginLoading ? "Signing in..." : "Open Admin Panel →"}
            </button>

            {adminMessage && <p className="admin-error">{adminMessage}</p>}
          </div>
        </div>
      )}

      {/* =====================================================
          ADMIN PANEL
      ===================================================== */}

      {showAdminPanel && (
        <div className="admin-panel-overlay">
          <div className="admin-panel">
            <div className="admin-panel-header">
              <div>
                <p className="section-eyebrow">KEDAR TYRES</p>
                <h2>Admin Catalogue</h2>
                <p>Add or remove tyre listings shown on the website.</p>
              </div>
              <button className="login-close" onClick={() => setShowAdminPanel(false)}>×</button>
            </div>

            <div className="admin-add-form">
              <input placeholder="Tyre Size" value={newTyre.size} onChange={(e) => setNewTyre({ ...newTyre, size: e.target.value })} />
              <input placeholder="Brand" value={newTyre.brand} onChange={(e) => setNewTyre({ ...newTyre, brand: e.target.value })} />
              <input placeholder="Image path (e.g. /tyre1.png)" value={newTyre.image} onChange={(e) => setNewTyre({ ...newTyre, image: e.target.value })} />
              <button
                className="login-submit"
                onClick={() => {
                  if (!newTyre.size.trim() || !newTyre.brand.trim()) return;
                  setCatalogueTyres((current) => {
                    const existingIndex = current.findIndex((item) => item.size.toLowerCase() === newTyre.size.trim().toLowerCase());
                    if (existingIndex >= 0) {
                      return current.map((item, index) =>
                        index === existingIndex
                          ? { ...item, brands: [...new Set([...(item.brands || []), newTyre.brand.trim()])] }
                          : item
                      );
                    }
                    return [...current, { size: newTyre.size.trim(), brands: [newTyre.brand.trim()], image: newTyre.image || "/tyre1.png" }];
                  });
                  setNewTyre({ size: "", brand: "", image: "/tyre1.png" });
                  setAdminMessage("Tyre posted successfully.");
                }}
              >
                + Post New Tyre
              </button>
            </div>

            {adminMessage && <p className="admin-success">{adminMessage}</p>}

            <div className="admin-product-list">
              {catalogueTyres.map((tyre, index) => (
                <div className="admin-product-row" key={`${tyre.size}-${index}`}>
                  <div>
                    <strong>{tyre.size}</strong>
                    <span>{(tyre.brands || []).join(" · ")}</span>
                  </div>
                  <button
                    className="admin-delete-button"
                    onClick={() => {
                      setCatalogueTyres((current) => current.filter((_, itemIndex) => itemIndex !== index));
                      setFavouriteTyres((current) => current.filter((id) => !id.includes(tyre.size)));
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          WHATSAPP
      ===================================================== */}

      {whatsappOpen && (

        <div className="whatsapp-wrapper">

          <button
            type="button"
            className="whatsapp-button"
            onClick={() => contactOwner("whatsapp")}
            aria-label="Contact Kedar Tyres on WhatsApp"
          >
            💬
          </button> 
 
          <button 
            className="whatsapp-close" 
            onClick={() => setWhatsappOpen(false)} 
          > 
            × 
          </button> 
 
        </div> 
 
      )} 
 
    </div> 
  ); 
} 
 
export default App; 