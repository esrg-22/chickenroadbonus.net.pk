(() => {
  "use strict";

  // =========================== Init AOS =========================== //
  AOS.init({
    once: true,
    offset: 50,
    disable: "tablet",
  });

  // =========================== Start of Header =========================== //
  const headerRef = document.querySelector(".header");
  const navRef = headerRef.querySelector(".navbar");
  const desktopNavRef = navRef; // same element on desktop and mobile
  const mobileNavRef  = navRef;

  const linkRef = navRef.querySelectorAll("a:not(.nav-dropdown-menu a), .nav-dropdown-trigger");
  const navIndicatorRef = navRef.querySelector(".indicator");
  const navTogglerRef = headerRef.querySelector(".navToggler");
  let indicatorPosition = null;

  // Function to set indicator position
  const setIndicatorPosition = (left, width) => {
    if (!navIndicatorRef) return;
    indicatorPosition = { left, width };
    navIndicatorRef.style.left = `${left}px`;
    navIndicatorRef.style.width = `${width}px`;
  };

  const getActiveOffsetEl = (ref) => {
    const activeEl = ref.querySelector(".active") || ref.querySelector(".nav-dropdown.active .nav-dropdown-trigger");
    if (!activeEl) return null;
    return activeEl.classList.contains("nav-dropdown-trigger")
      ? activeEl.closest(".nav-dropdown")
      : activeEl;
  };

  // Update indicator position when active link changes
  window.addEventListener("load", () => {
    const offsetEl = getActiveOffsetEl(navRef);
    if (offsetEl) {
      setIndicatorPosition(offsetEl.offsetLeft, offsetEl.offsetWidth);
      setTimeout(() => {
        if (navIndicatorRef) {
          navIndicatorRef.style.opacity = 1;
          navIndicatorRef.style.transform = "scaleX(1)";
        }
      }, 300);
    }
    // If no active nav item, keep indicator hidden (non-header page)
  });

  // Handle mouse leave — snap indicator back to active (or hide if none)
  navRef.addEventListener("mouseleave", () => {
    const offsetEl = getActiveOffsetEl(navRef);
    if (offsetEl) {
      setIndicatorPosition(offsetEl.offsetLeft, offsetEl.offsetWidth);
      if (navIndicatorRef) { navIndicatorRef.style.opacity = 1; navIndicatorRef.style.transform = "scaleX(1)"; }
    } else {
      // No active page — hide indicator after hover
      if (navIndicatorRef) { navIndicatorRef.style.opacity = 0; navIndicatorRef.style.transform = "scaleX(0.5)"; }
    }
  });

  // Handle mouse enter on each nav item
  const handleLinkMouseEnter = (event) => {
    const link = event.currentTarget;
    const offsetEl = link.classList.contains("nav-dropdown-trigger")
      ? link.closest(".nav-dropdown")
      : link;
    setIndicatorPosition(offsetEl.offsetLeft, offsetEl.offsetWidth);
    if (navIndicatorRef) { navIndicatorRef.style.opacity = 1; navIndicatorRef.style.transform = "scaleX(1)"; }
  };

  linkRef.forEach((link) => {
    link.addEventListener("mouseenter", handleLinkMouseEnter);
  });

  // Header stays always visible — scroll-fade disabled

  // Open-Close Mobile Nav state
  let mobileNavOpen = false;
  const html = document.documentElement;
  const navOverlayRef = headerRef.querySelector(".navOverlay");
  const toggleMobileNav = () => {
    mobileNavOpen = !mobileNavOpen;
    if (mobileNavOpen) {
      html.classList.add("overflow-hidden");
      headerRef.classList.add("navOpen");
      if (navOverlayRef) navOverlayRef.classList.add("navOverlayVisible");
    } else {
      html.classList.remove("overflow-hidden");
      headerRef.classList.remove("navOpen");
      if (navOverlayRef) navOverlayRef.classList.remove("navOverlayVisible");
    }
  };
  navTogglerRef.addEventListener("click", toggleMobileNav);

  // Overlay click closes mobile menu
  if (navOverlayRef) {
    navOverlayRef.addEventListener("click", () => {
      if (mobileNavOpen) toggleMobileNav();
    });
  }

  // Tapping a nav link on mobile also closes the menu
  navRef.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      if (mobileNavOpen) toggleMobileNav();
    });
  });

  // =========================== Dropdown menus (with safety triangle) =========================== //
  const dropdowns = headerRef.querySelectorAll(".nav-dropdown");

  const closeAllDropdowns = (except) => {
    dropdowns.forEach((d) => {
      if (d !== except) {
        d.classList.remove("open");
        d._safeTimer && clearTimeout(d._safeTimer);
      }
    });
  };

  dropdowns.forEach((dropdown) => {
    const trigger = dropdown.querySelector(".nav-dropdown-trigger");
    const menu = dropdown.querySelector(".nav-dropdown-menu");

    // Mobile: toggle on click
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      if (window.innerWidth >= 1024) return;
      const isOpen = dropdown.classList.contains("open");
      closeAllDropdowns(dropdown);
      dropdown.classList.toggle("open", !isOpen);
    });

    if (window.innerWidth < 1024) return; // rest is desktop-only

    let mouseX = 0, mouseY = 0;
    let lastMenuEnterX = 0, lastMenuEnterY = 0;

    // Track cursor globally so we can check trajectory
    document.addEventListener("mousemove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    }, { passive: true });

    // Open immediately on trigger hover
    trigger.addEventListener("mouseenter", () => {
      if (window.innerWidth < 1024) return;
      dropdown._safeTimer && clearTimeout(dropdown._safeTimer);
      closeAllDropdowns(dropdown);
      dropdown.classList.add("open");
    });

    // When leaving the trigger, check if cursor is heading toward the menu
    trigger.addEventListener("mouseleave", (e) => {
      if (window.innerWidth < 1024) return;

      dropdown._safeTimer && clearTimeout(dropdown._safeTimer);

      dropdown._safeTimer = setTimeout(() => {
        // Get menu bounding box
        const menuRect = menu.getBoundingClientRect();

        // Is the cursor currently inside the menu? Keep open.
        if (
          mouseX >= menuRect.left - 8 &&
          mouseX <= menuRect.right + 8 &&
          mouseY >= menuRect.top - 8 &&
          mouseY <= menuRect.bottom + 8
        ) return;

        // Is cursor moving generally downward toward the menu?
        // Build a "safety triangle": trigger bottom-left, trigger bottom-right, cursor
        const triggerRect = trigger.getBoundingClientRect();
        const slope1 = (mouseY - triggerRect.bottom) / (mouseX - triggerRect.left);
        const slope2 = (mouseY - triggerRect.bottom) / (mouseX - triggerRect.right);
        const movingTowardMenu =
          mouseY > triggerRect.bottom &&
          mouseY < menuRect.bottom &&
          mouseX > menuRect.left - 40 &&
          mouseX < menuRect.right + 40;

        if (!movingTowardMenu) {
          dropdown.classList.remove("open");
        }
      }, 80);
    });

    // Entering the menu cancels any pending close
    menu.addEventListener("mouseenter", () => {
      dropdown._safeTimer && clearTimeout(dropdown._safeTimer);
      dropdown.classList.add("open");
    });

    // Leaving the menu closes it
    menu.addEventListener("mouseleave", () => {
      dropdown._safeTimer && clearTimeout(dropdown._safeTimer);
      dropdown._safeTimer = setTimeout(() => {
        dropdown.classList.remove("open");
      }, 80);
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener("click", () => closeAllDropdowns(null));
  navRef.addEventListener("click", (e) => e.stopPropagation());

  // =========================== End of Header =========================== //

  // =========================== Start of Banner =========================== //
  const handleBannerScroll = () => {
    const bannerTextRef = document.querySelector(".banner .bg-text");
    if (bannerTextRef !== null) {
      const scrollValue = window.scrollY;
      bannerTextRef.style.opacity = (1000 - scrollValue) / 1000;
      bannerTextRef.style.transform = `translateX(-${scrollValue}px)`;
    }
  };
  window.addEventListener("scroll", handleBannerScroll);
  // =========================== End of Banner =========================== //

  // =========================== Start of About Image =========================== //
  window.addEventListener("load", () => {
    const aboutImagesRef = document.querySelector(".about-images");
    if (aboutImagesRef !== null) {
      const allImage = aboutImagesRef.querySelectorAll("img");
      const imageLength = allImage.length;
      const swapImageBtn = document.querySelector(".swap-images-btn");
      const swapImageBtnIcon = swapImageBtn.querySelector("svg");

      // generate random numbers
      const numbers = [];
      const min = -6;
      const max = 6;
      while (numbers.length < imageLength) {
        const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
        if (!numbers.includes(randomNumber)) {
          numbers.push(randomNumber);
        }
      }

      // rotate images randomly and set zindex
      setTimeout(() => {
        aboutImagesRef.querySelectorAll("img").forEach((image, index) => {
          image.parentElement.style.transform = `rotate(${numbers[index]}deg)`;
          image.parentElement.style.zIndex = `${numbers[index]}`;
        });
      }, 300);

      // chnage zIndex on click to show image 1 by 1 and rotate button icon
      let currentZIndex = 1;
      let rotateValue = 0;
      const handleClick = () => {
        for (let i = 0; i < imageLength; i++) {
          allImage[i].parentElement.style.zIndex = currentZIndex;
          currentZIndex--;
          if (currentZIndex < -imageLength) {
            currentZIndex = 0;
          }
        }
        swapImageBtnIcon.style.transform = `rotate(${rotateValue + 360}deg)`;
        rotateValue += 360;
      };
      aboutImagesRef.addEventListener("click", handleClick);
      swapImageBtn.addEventListener("click", handleClick);
    }
  });
  // =========================== End of About Image =========================== //

  // =========================== Start of FAQ =========================== //
  const faqItemRef = document.querySelectorAll(".faq-item");
  if (faqItemRef.length !== 0) {
    faqItemRef.forEach((item) => { item._faqOpen = false; });

    faqItemRef.forEach((item) => {
      const faqItemHeaderRef = item.querySelector(".faq-item-header");
      const faqItemContentRef = item.querySelector(".faq-item-content");
      const iconPlus = item.querySelector(".faq-icon-plus");
      const iconMinus = item.querySelector(".faq-icon-minus");

      const handleFaqItemClick = () => {
        const isOpen = item._faqOpen;

        // Close all other open items
        faqItemRef.forEach((other) => {
          if (other !== item && other._faqOpen) {
            other.querySelector(".faq-item-content").style.maxHeight = "0";
            const op = other.querySelector(".faq-icon-plus");
            const om = other.querySelector(".faq-icon-minus");
            if (op)  { op.style.opacity = "1"; op.style.transform = "rotate(0deg) scale(1)"; }
            if (om) { om.style.opacity = "0"; om.style.transform = "rotate(-90deg) scale(0.7)"; }
            other._faqOpen = false;
          }
        });

        if (!isOpen) {
          // Opening
          item._faqOpen = true;
          faqItemContentRef.style.maxHeight = faqItemContentRef.scrollHeight + "px";
          if (iconPlus)  { iconPlus.style.opacity  = "0"; iconPlus.style.transform  = "rotate(45deg) scale(0.7)"; }
          if (iconMinus) { iconMinus.style.opacity = "1"; iconMinus.style.transform = "rotate(0deg) scale(1)"; }
        } else {
          // Closing: scroll compensation so page doesn't jump
          const headerAbsTop = faqItemHeaderRef.getBoundingClientRect().top + window.scrollY;
          const contentHeight = faqItemContentRef.scrollHeight;
          const isScrolledPast = window.scrollY > headerAbsTop;

          item._faqOpen = false;
          faqItemContentRef.style.maxHeight = "0";
          if (iconPlus)  { iconPlus.style.opacity  = "1"; iconPlus.style.transform  = "rotate(0deg) scale(1)"; }
          if (iconMinus) { iconMinus.style.opacity = "0"; iconMinus.style.transform = "rotate(-90deg) scale(0.7)"; }

          if (isScrolledPast) {
            // Instantly compensate — keeps items below in the same viewport position
            window.scrollTo({ top: window.scrollY - contentHeight, behavior: "instant" });
          }
        }
      };
      faqItemHeaderRef.addEventListener("click", handleFaqItemClick);
    });
  }
  // =========================== End of FAQ =========================== //

  // =========================== Start of Contact form =========================== //
  const contactFormRef = document.querySelector(".contact-form");
  if (contactFormRef !== null) {
    const submitBtnRef = contactFormRef.querySelector("button[type='submit']");
    const submitBtnTextRef = submitBtnRef.innerHTML;
    const statusRef = contactFormRef.querySelector(".status");
    const emailAddress = "platoltheme@gmail.com";
    const formsubmitURL = `https://formsubmit.co/ajax/${emailAddress}`;

    const formHandler = (e) => {
      e.preventDefault();

      submitBtnRef.innerHTML = "<span>Sending..</span>";

      fetch(formsubmitURL, {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({
          _subject: "Message form Aver Html!",
          name: full_name.value,
          email: email.value,
          message: message.value,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          statusRef.classList.remove("hidden");
          statusRef.style.color = "#16A34A";
          statusRef.innerHTML = "Submitted Successfully!";

          setTimeout(() => {
            statusRef.classList.add("hidden");
            statusRef.innerHTML = submitBtnTextRef;
          }, 5000);

          e.target.reset();
        })
        .catch((error) => {
          statusRef.classList.remove("hidden");
          statusRef.style.color = "#DC2626";
          statusRef.innerHTML = "Something went wrong!";
        });
    };
    contactFormRef.addEventListener("submit", formHandler);
  }

  // =========================== End of Contact form =========================== //
})();


// ── Preloader ────────────────────────────────────────────────
(() => {
  const preloader = document.querySelector(".aver-preloader");
  if (!preloader) return;
  const hide = () => preloader.classList.add("loaded");
  if (document.readyState === "complete") { hide(); }
  else {
    window.addEventListener("load", hide);
    setTimeout(hide, 4000);
  }
})();

// ── Scroll-to-top button ─────────────────────────────────────
(() => {
  const btn = document.querySelector(".scroll-top");
  if (!btn) return;
  window.addEventListener("scroll", () => {
    btn.classList.toggle("show", window.scrollY > 400);
  }, { passive: true });
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
})();

// ── Table mobile scroll wrapper ───────────────────────────────
(() => {
  document.querySelectorAll('.content table').forEach(table => {
    if (table.parentElement.classList.contains('table-scroll')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'table-scroll';
    table.parentNode.insertBefore(wrapper, table);
    wrapper.appendChild(table);
  });
})();
