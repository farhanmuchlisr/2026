const burgerBtn = document.getElementById("burger-btn");
      const navMenu = document.getElementById("nav-menu");

      burgerBtn.addEventListener("click", () => {
        navMenu.classList.toggle("active");
      });