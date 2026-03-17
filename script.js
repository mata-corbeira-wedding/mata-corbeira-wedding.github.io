document.addEventListener("DOMContentLoaded", () => {
  const navToggle = document.querySelector(".nav-toggle");
  const navLinksWrapper = document.querySelector(".nav-links-wrapper");

  if (navToggle && navLinksWrapper) {
    navToggle.addEventListener("click", () => {
      const isOpen = navLinksWrapper.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
    });

    navLinksWrapper.addEventListener("click", (event) => {
      if (event.target instanceof HTMLElement && event.target.matches(".nav-link")) {
        navLinksWrapper.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  if ("scrollBehavior" in document.documentElement.style === false) {
    document.querySelectorAll('a[href^="#"]').forEach((link) => {
      link.addEventListener("click", (event) => {
        const targetId = link.getAttribute("href");
        if (!targetId || targetId === "#") return;
        const target = document.querySelector(targetId);
        if (!target) return;

        event.preventDefault();
        const rect = target.getBoundingClientRect();
        const offset = window.scrollY + rect.top - 80;
        window.scrollTo({ top: offset, behavior: "smooth" });
      });
    });
  }

  const translations = {
    en: {
      brand_names: "Maria & Raynulfo",
      brand_date: "December 29th 2026 · North Miami Beach",
      nav_home: "Home",
      nav_wedding_day: "Wedding Day",
      nav_registry: "Registry",
      nav_hotel: "Hotel",
      nav_things_to_do: "Things To Do",
      home_rsvp_button: "RSVP",
      home_names_line1: "Maria Alejandra",
      home_names_line2: "Corbeira Raventos",
      home_names_amp: "&",
      home_names_line3: "Raynulfo Jesus",
      home_names_line4: "Mata Negrette",
      home_date_location:
        "December 29th 2026 · Ancient Spanish Monastery · North Miami Beach, Florida",
      home_ceremony_title: "Ceremony",
      home_ceremony_time: "4:00 PM · Chapel of St. Bernard de Clairvaux",
      home_cocktail_title: "Cocktail Hour",
      home_cocktail_time: "5:00 PM · Cloister Garden",
      home_reception_title: "Celebration",
      home_reception_time: "6:30 PM · Refectory & Courtyard",
      home_transport:
        "Parking at the monastery is limited. We kindly recommend using Uber, Lyft, or shared rides when possible.",
      wedding_kicker: "Wedding Day",
      wedding_title: "Wedding Day Information",
      wedding_subtitle:
        "Everything you need to know for our celebration at the Ancient Spanish Monastery.",
      wedding_timeline_title: "Schedule & Flow",
      wedding_timeline_ceremony_time: "4:00 PM",
      wedding_timeline_ceremony_title: "Catholic Ceremony",
      wedding_timeline_ceremony_desc:
        "Please arrive 20–30 minutes early to find your seat in the historic chapel.",
      wedding_timeline_cocktail_time: "5:00 PM",
      wedding_timeline_cocktail_title: "Cocktail Hour",
      wedding_timeline_cocktail_desc:
        "Join us in the cloister gardens for cocktails, music, and a first look at the monastery at sunset.",
      wedding_timeline_reception_time: "6:30 PM",
      wedding_timeline_reception_title: "Dinner & Celebration",
      wedding_timeline_reception_desc:
        "Dinner, speeches, and dancing in the refectory and courtyard beneath the arches and oak trees.",
      wedding_dress_code_title: "Dress Code",
      wedding_dress_code_body:
        "Formal evening attire. The monastery features stone floors and garden paths, so we recommend comfortable shoes or block heels. December evenings can be breezy, so a light wrap or jacket is a good idea.",
      wedding_venue_title: "Venue & Directions",
      wedding_venue_body:
        "The Ancient Spanish Monastery is a historic cloister with several distinct spaces. The chapel, gardens, and reception hall are a short walk from one another within the same grounds.",
      wedding_venue_item_chapel:
        "Chapel entrance: main church doors facing the front courtyard.",
      wedding_venue_item_cocktail: "Cocktail: cloister garden just beyond the chapel.",
      wedding_venue_item_reception: "Reception: refectory hall and adjoining courtyard.",
      wedding_venue_map_caption:
        "Monastery map: chapel, cocktail area, and reception.",
      wedding_monastery_button: "Visit Monastery Website",
      wedding_transport_title: "Parking & Transportation",
      wedding_transport_body:
        "Parking at the monastery is limited. If you are able, please consider taking Uber, Lyft, or carpooling. If you do drive, allow extra time to park and walk through the gardens to the chapel.",
      registry_kicker: "Registry",
      registry_title: "Gifts & Registry",
      registry_subtitle:
        "Your presence is the greatest gift. If you would also like to honor us with a present, we have gathered a few ideas below.",
      registry_amazon_title: "Amazon Registry",
      registry_amazon_body:
        "We have selected a small collection of items for our home. You can view the full list on Amazon.",
      registry_amazon_button: "View Amazon Registry",
      registry_fund_title: "Honeymoon & Future Home Fund",
      registry_fund_body:
        "For those who prefer, you may contribute to our honeymoon and future home fund. We are deeply grateful for any gesture.",
      registry_zelle_label: "Zelle:",
      registry_zelle_note:
        "Send to this number via your bank's Zelle app.",
      registry_other_title: "Other Ideas",
      registry_other_body:
        "If you prefer to share a gift in another way, please feel welcome to reach out to our families or to us directly. We are simply honored to celebrate with you.",
      hotel_kicker: "Stay",
      hotel_title: "Hotel Suggestions",
      hotel_subtitle:
        "For our guests traveling from near and far, here are a few areas and hotels to consider during your stay in Miami.",
      hotel_intro:
        "We recommend staying either near the venue in North Miami Beach or near our home in Doral.",
      hotel_airbnb_title: "Airbnb & Vacation Rentals",
      hotel_airbnb_body:
        "Airbnb and other vacation rentals are also available in North Miami Beach, Doral, and Miami Beach. If you prefer a home or apartment, search for stays near those areas.",
      hotel_airbnb_pairing:
        "Would you like to share an Airbnb with other guests to split costs? Please reach out to the bride or groom and we will try to help connect you with others looking to share.",
      hotel_group_venue_title: "Near the Venue · North Miami Beach",
      hotel_group_doral_title: "Doral · Close to Our Home",
      hotel_link_website: "Hotel Website",
      hotel_link_map: "View on Map",
      rsvp_title: "RSVP",
      rsvp_intro:
        "Please confirm your attendance by entering your phone number and letting us know if you will join us.",
      rsvp_country_label: "Country / Area Code",
      rsvp_phone_label: "Phone Number",
      rsvp_phone_placeholder: "123 456 7890",
      rsvp_attending_label: "Will you attend?",
      rsvp_attending_yes: "Yes, I will be there",
      rsvp_attending_no: "No, I am unable to attend",
      rsvp_notes_label: "Notes (dietary, plus-one, etc.)",
      rsvp_submit_label: "Submit RSVP",
      rsvp_footer_note: "RSVP submissions are collected securely via Google Forms.",
      things_kicker: "Explore",
      things_title: "Things To Do",
      things_subtitle:
        "Make a mini-vacation of your trip. Here are ideas to help you enjoy Miami before and after the wedding.",
      things_near_venue_title: "Near the Venue",
      things_near_venue_item1_title: "Beaches & Parks (Sample)",
      things_near_venue_item1_body:
        "Enjoy nearby beaches and green spaces in North Miami Beach. We will add specific recommendations closer to the date.",
      things_miami_beach_title: "Miami & Miami Beach",
      things_miami_beach_item1_title: "Art, Food & Nightlife (Sample)",
      things_miami_beach_item1_body:
        "From Wynwood walls to restaurants and music, there is always something to do. We will share some of our favorite spots soon.",
      things_doral_title: "Doral & Local Favorites",
      things_doral_item1_title: "Neighborhood Spots (Sample)",
      things_doral_item1_body:
        "We will add recommendations near our home in Doral—cafés, restaurants, and places we love.",
    },
    es: {
      brand_names: "Maria y Raynulfo",
      brand_date: "29 de diciembre de 2026 · North Miami Beach",
      nav_home: "Inicio",
      nav_wedding_day: "El Gran Día",
      nav_registry: "Regalos",
      nav_hotel: "Hoteles",
      nav_things_to_do: "Qué Hacer",
      home_rsvp_button: "Confirmar asistencia",
      home_names_line1: "Maria Alejandra",
      home_names_line2: "Corbeira Raventos",
      home_names_amp: "y",
      home_names_line3: "Raynulfo Jesus",
      home_names_line4: "Mata Negrette",
      home_date_location:
        "29 de diciembre de 2026 · Ancient Spanish Monastery · North Miami Beach, Florida",
      home_ceremony_title: "Ceremonia",
      home_ceremony_time: "4:00 p. m. · Capilla de San Bernardo de Claraval",
      home_cocktail_title: "Coctel",
      home_cocktail_time: "5:00 p. m. · Jardines del claustro",
      home_reception_title: "Celebración",
      home_reception_time: "6:30 p. m. · Refectorio y patio",
      home_transport:
        "El estacionamiento en el monasterio es limitado. Les recomendamos usar Uber, Lyft o compartir carro siempre que sea posible.",
      wedding_kicker: "El Gran Día",
      wedding_title: "Información del día de la boda",
      wedding_subtitle:
        "Todo lo que necesitas saber para celebrar con nosotros en el Ancient Spanish Monastery.",
      wedding_timeline_title: "Horario y recorrido",
      wedding_timeline_ceremony_time: "4:00 p. m.",
      wedding_timeline_ceremony_title: "Ceremonia católica",
      wedding_timeline_ceremony_desc:
        "Te pedimos llegar 20–30 minutos antes para encontrar tu puesto en la capilla histórica.",
      wedding_timeline_cocktail_time: "5:00 p. m.",
      wedding_timeline_cocktail_title: "Coctel",
      wedding_timeline_cocktail_desc:
        "Acompáñanos en los jardines del claustro para cocteles, música y la magia del atardecer en el monasterio.",
      wedding_timeline_reception_time: "6:30 p. m.",
      wedding_timeline_reception_title: "Cena y fiesta",
      wedding_timeline_reception_desc:
        "Cena, brindis y baile en el refectorio y el patio, bajo los arcos y el gran roble.",
      wedding_dress_code_title: "Código de vestimenta",
      wedding_dress_code_body:
        "Etiqueta de noche. El monasterio tiene pisos de piedra y senderos en el jardín, por lo que recomendamos zapatos cómodos o tacones anchos. Las noches de diciembre pueden ser frescas, así que un chal o saco ligero es buena idea.",
      wedding_venue_title: "El lugar y cómo llegar",
      wedding_venue_body:
        "El Ancient Spanish Monastery es un claustro histórico con varios espacios. La capilla, los jardines y el salón de recepción están a pocos pasos unos de otros dentro del mismo recinto.",
      wedding_venue_item_chapel:
        "Entrada a la capilla: puertas principales de la iglesia frente al patio de entrada.",
      wedding_venue_item_cocktail:
        "Coctel: jardines del claustro justo después de la capilla.",
      wedding_venue_item_reception:
        "Recepción: salón del refectorio y patio contiguo.",
      wedding_venue_map_caption:
        "Mapa del monasterio: capilla, área de coctel y recepción.",
      wedding_monastery_button: "Visitar sitio del monasterio",
      wedding_transport_title: "Transporte y estacionamiento",
      wedding_transport_body:
        "El estacionamiento en el monasterio es limitado. Si puedes, considera venir en Uber, Lyft o compartiendo carro. Si manejas, llega con tiempo para estacionar y caminar por los jardines hasta la capilla.",
      registry_kicker: "Regalos",
      registry_title: "Regalos y mesa de bodas",
      registry_subtitle:
        "Su presencia es el regalo más importante. Si además desean honrarnos con un obsequio, les compartimos algunas opciones.",
      registry_amazon_title: "Lista en Amazon",
      registry_amazon_body:
        "Hemos escogido algunos detalles para nuestro hogar. Puedes ver la lista completa en Amazon.",
      registry_amazon_button: "Ver lista en Amazon",
      registry_fund_title: "Fondo de luna de miel y hogar",
      registry_fund_body:
        "Si lo prefieres, puedes contribuir a nuestra luna de miel y a nuestro futuro hogar. Agradecemos de corazón cualquier detalle.",
      registry_zelle_label: "Zelle:",
      registry_zelle_note:
        "Envía a este número desde la app Zelle de tu banco.",
      registry_other_title: "Otras ideas",
      registry_other_body:
        "Si prefieres compartir un regalo de otra forma, siéntete libre de hablar con nuestras familias o con nosotros directamente. Lo más importante para nosotros es celebrar contigo.",
      hotel_kicker: "Hospedaje",
      hotel_title: "Sugerencias de hoteles",
      hotel_subtitle:
        "Para quienes viajan desde fuera o desde otras ciudades, aquí van algunas zonas y hoteles a considerar durante su estancia en Miami.",
      hotel_intro:
        "Recomendamos hospedarse cerca del lugar en North Miami Beach o cerca de nuestra casa en Doral.",
      hotel_airbnb_title: "Airbnb y alquileres vacacionales",
      hotel_airbnb_body:
        "También hay Airbnb y otros alquileres vacacionales en North Miami Beach, Doral y Miami Beach. Si prefieres una casa o apartamento, busca alojamientos cerca de esas zonas.",
      hotel_airbnb_pairing:
        "¿Te gustaría compartir un Airbnb con otros invitados para dividir gastos? Comunícate con la novia o el novio y trataremos de conectarte con quienes busquen compartir.",
      hotel_group_venue_title: "Cerca del lugar · North Miami Beach",
      hotel_group_doral_title: "Doral · Cerca de nuestra casa",
      hotel_link_website: "Sitio del hotel",
      hotel_link_map: "Ver mapa",
      rsvp_title: "Confirmar asistencia",
      rsvp_intro:
        "Por favor confirma tu asistencia ingresando tu número de teléfono y contándonos si podrás acompañarnos.",
      rsvp_country_label: "País / código",
      rsvp_phone_label: "Número de teléfono",
      rsvp_phone_placeholder: "123 456 7890",
      rsvp_attending_label: "¿Podrás asistir?",
      rsvp_attending_yes: "Sí, estaré allí",
      rsvp_attending_no: "No, no podré asistir",
      rsvp_notes_label: "Notas (alimentación, acompañantes, etc.)",
      rsvp_submit_label: "Enviar confirmación",
      rsvp_footer_note: "Las confirmaciones se registran de forma segura a través de Google Forms.",
      things_kicker: "Para disfrutar",
      things_title: "Qué hacer en Miami",
      things_subtitle:
        "Aprovecha el viaje como unas mini vacaciones. Aquí compartiremos ideas para disfrutar Miami antes y después de la boda.",
      things_near_venue_title: "Cerca del monasterio",
      things_near_venue_item1_title: "Playas y parques (ejemplo)",
      things_near_venue_item1_body:
        "Disfruta de las playas y áreas verdes en North Miami Beach. Agregaremos recomendaciones específicas más adelante.",
      things_miami_beach_title: "Miami y Miami Beach",
      things_miami_beach_item1_title: "Arte, comida y vida nocturna (ejemplo)",
      things_miami_beach_item1_body:
        "Desde Wynwood hasta los restaurantes y la música, siempre hay algo que hacer. Pronto compartiremos algunos de nuestros lugares favoritos.",
      things_doral_title: "Doral y nuestros favoritos",
      things_doral_item1_title: "Sitios de barrio (ejemplo)",
      things_doral_item1_body:
        "Agregaremos recomendaciones cerca de nuestra casa en Doral: cafés, restaurantes y sitios que nos encantan.",
    },
  };

  const langButtons = document.querySelectorAll(".lang-btn");
  let currentLang = "en";

  function applyTranslations(lang) {
    const dict = translations[lang];
    if (!dict) return;

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (!key) return;
      const value = dict[key];
      if (typeof value === "string") {
        el.textContent = value;
      }
    });

    document.documentElement.lang = lang;
  }

  langButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const lang = btn.getAttribute("data-lang");
      if (!lang || lang === currentLang) return;
      currentLang = lang;

      langButtons.forEach((b) => {
        const isActive = b === btn;
        b.classList.toggle("is-active", isActive);
        b.setAttribute("aria-pressed", String(isActive));
      });

      applyTranslations(lang);
    });
  });

  applyTranslations(currentLang);

  // RSVP modal and country codes
  const rsvpModal = document.getElementById("rsvp-modal");
  const rsvpOpenButton = document.querySelector(".hero-rsvp-button");
  const rsvpCloseTargets = document.querySelectorAll("[data-rsvp-close]");
  const countrySelect = document.getElementById("rsvp-country");
  const phoneInput = document.getElementById("rsvp-phone");

  function openRsvp() {
    if (!rsvpModal) return;
    rsvpModal.classList.add("is-open");
    rsvpModal.setAttribute("aria-hidden", "false");
    if (phoneInput) {
      phoneInput.focus();
    }
  }

  function closeRsvp() {
    if (!rsvpModal) return;
    rsvpModal.classList.remove("is-open");
    rsvpModal.setAttribute("aria-hidden", "true");
  }

  if (rsvpOpenButton) {
    rsvpOpenButton.addEventListener("click", openRsvp);
  }

  rsvpCloseTargets.forEach((el) => {
    el.addEventListener("click", closeRsvp);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeRsvp();
    }
  });

  if (countrySelect) {
    fetch("data/country-codes.json")
      .then((res) => (res.ok ? res.json() : []))
      .then((codes) => {
        if (!Array.isArray(codes)) return;
        countrySelect.innerHTML = "";
        codes.forEach((entry) => {
          const option = document.createElement("option");
          const flag = entry.flag || "";
          option.value = entry.code || "";
          option.textContent = `${flag} ${entry.code || ""} — ${entry.country || ""}`.trim();
          countrySelect.appendChild(option);
        });
      })
      .catch(() => {
        // If loading fails, fall back to a simple +1 option
        const option = document.createElement("option");
        option.value = "+1";
        option.textContent = "+1";
        countrySelect.appendChild(option);
      });
  }
});

