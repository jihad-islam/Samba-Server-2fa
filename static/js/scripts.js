let fullFileList = []; // Store the full list of files and folders

// my code

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");
  const otpForm = document.getElementById("otpForm");
  const loginFormContainer = document.getElementById("loginFormContainer");
  const otpFormContainer = document.getElementById("otpFormContainer");
  const loginButton = loginForm.querySelector("button");
  const passwordInput = document.getElementById("password");

  // Password Visibility Toggle
  function createPasswordToggle() {
    const toggleBtn = document.createElement("button");
    toggleBtn.innerHTML = "👁️";
    toggleBtn.className =
      "absolute right-4 top-1/2 transform -translate-y-1/2 text-[#7f8c8d] hover:text-[#ecf0f1] transition-colors";
    toggleBtn.type = "button";
    toggleBtn.addEventListener("click", () => {
      passwordInput.type =
        passwordInput.type === "password" ? "text" : "password";
      toggleBtn.innerHTML = passwordInput.type === "password" ? "👁️" : "👁️‍🗨️";
    });

    const inputWrapper = document.createElement("div");
    inputWrapper.className = "relative";
    passwordInput.parentNode.insertBefore(inputWrapper, passwordInput);
    inputWrapper.appendChild(passwordInput);
    inputWrapper.appendChild(toggleBtn);

    return toggleBtn;
  }

  // Particle Background Effect
  function createParticleBackground() {
    const particlesContainer = document.createElement("div");
    particlesContainer.className =
      "particle-background fixed inset-0 z-[-1] overflow-hidden";
    document.body.appendChild(particlesContainer);

    const particleCount = 50;
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement("div");
      particle.className = "absolute rounded-full bg-white/10 animate-particle";
      particle.style.width = `${Math.random() * 5}px`;
      particle.style.height = particle.style.width;
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.top = `${Math.random() * 100}%`;
      particle.style.animationDuration = `${10 + Math.random() * 20}s`;
      particle.style.animationDelay = `${Math.random() * 10}s`;
      particlesContainer.appendChild(particle);
    }
  }

  // Animated Login Button with Loading State
  function setButtonLoading(button, isLoading) {
    if (isLoading) {
      button.disabled = true;
      button.innerHTML = `
                <span class="flex items-center justify-center">
                    <svg class="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                </span>
            `;
    } else {
      button.disabled = false;
      button.innerHTML = button.dataset.originalText || "Login";
    }
  }

  // Existing Login functionality
  document
    .getElementById("loginForm")
    ?.addEventListener("submit", async function (e) {
      e.preventDefault();
      const button = e.target.querySelector("button");
      setButtonLoading(button, true);

      const username = document.getElementById("username").value;
      const password = document.getElementById("password").value;
      const messageDiv = document.getElementById("message");

      try {
        const response = await fetch("/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username, password }),
        });

        const result = await response.json();
        setButtonLoading(button, false);

        if (!response.ok) {
          messageDiv.textContent =
            result.message || "Invalid username or password";
          messageDiv.style.color = "red";
        } else if (result.otp_required) {
          // OTP flow
          // Update the part where OTP form is shown
          loginFormContainer.classList.add("animate-slideOut");
          setTimeout(() => {
            loginFormContainer.classList.add("hidden");
            otpFormContainer.classList.remove("hidden");
            otpFormContainer.classList.add("animate-slideIn");
            sessionStorage.setItem("username", username);

            // Start the OTP countdown
            const otpTimerInterval = startOTPCountdown();

            // Optional: Clear interval if user navigates away or OTP is verified
            sessionStorage.setItem("otpTimerInterval", otpTimerInterval);
          }, 500);
        } else {
          window.location.href = "/shared_folders";
        }
      } catch (error) {
        console.error("Login error:", error);
        messageDiv.textContent = "Network error. Please try again.";
        messageDiv.style.color = "red";
        setButtonLoading(button, false);
      }
    });

  // Existing OTP Verification Functionality

  function startOTPCountdown() {
    const timerElement = document.getElementById("otpExpirationTimer");
    let remainingTime = 1 * 60; // 5 minutes in seconds

    function updateTimer() {
      const minutes = Math.floor(remainingTime / 60);
      const seconds = remainingTime % 60;

      // Format time with leading zeros
      const formattedMinutes = minutes.toString().padStart(2, "0");
      const formattedSeconds = seconds.toString().padStart(2, "0");

      timerElement.textContent = `OTP will expire in ${formattedMinutes}:${formattedSeconds}`;

      if (remainingTime <= 0) {
        clearInterval(timerInterval);
        timerElement.textContent = "OTP has expired. Please request a new one.";
        timerElement.classList.remove("text-yellow-500");
        timerElement.classList.add("text-red-500");
      }

      remainingTime--;
    }

    // Initial call to set text immediately
    updateTimer();

    // Start the interval
    const timerInterval = setInterval(updateTimer, 1000);

    // Return the interval so it can be cleared if needed
    return timerInterval;
  }

  // Modify the existing OTP form submission code
  document
    .getElementById("otpForm")
    ?.addEventListener("submit", async function (e) {
      e.preventDefault();
      const button = e.target.querySelector("button");
      setButtonLoading(button, true);

      const otp = document.getElementById("otp").value;
      const username = sessionStorage.getItem("username");

      const response = await fetch("/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, otp }),
      });

      const result = await response.json();
      const messageDiv = document.getElementById("otpMessage");
      messageDiv.textContent = result.message;
      messageDiv.style.color = response.ok ? "green" : "red";

      setButtonLoading(button, false);

      if (response.ok) {
        window.location.href = "/shared_folders";
      }
    });

  // Store original button text
  loginForm.querySelectorAll("button").forEach((btn) => {
    btn.dataset.originalText = btn.innerHTML;
  });

  // Create password toggle and particle background
  const passwordToggle = createPasswordToggle();
  createParticleBackground();
});

// Existing search, file upload/download, and other functions remain the same...

// Load shared files
async function loadSharedFiles() {
  const response = await fetch("/files", { method: "GET" });

  const fileList = document.getElementById("fileList");
  fileList.innerHTML = "";

  if (!response.ok) {
    fileList.innerHTML = "<li>Failed to load shared files.</li>";
    return;
  }

  const result = await response.json();
  fullFileList = result.files || [];
  displayFiles(fullFileList);
}

// Function to display files
function displayFiles(files) {
  const fileList = document.getElementById("fileList");
  fileList.innerHTML = "";

  if (files && files.length > 0) {
    files.forEach((file) => {
      const listItem = document.createElement("li");
      listItem.classList.add(
        "bg-gray-700",
        "p-6",
        "rounded-lg",
        "shadow",
        "hover:shadow-lg",
        "hover:scale-105",
        "transition",
        "flex",
        "items-center",
        "justify-between"
      );
      listItem.innerHTML = `
        <div class="flex items-center gap-4">
          <img
            src="${
              file.type === "folder"
                ? "/static/icons/folder.png"
                : "/static/icons/file.png"
            }"
            alt="${file.type} icon"
            class="h-10 w-10"
          />
          <span class="text-lg font-medium truncate text-white">${
            file.name
          }</span>
        </div>
      `;

      if (file.type === "file") {
        const downloadIcon = document.createElement("button");
        downloadIcon.classList.add(
          "p-2",
          "bg-gradient-to-r",
          "from-purple-500",
          "via-pink-500",
          "to-yellow-500",
          "hover:from-yellow-500",
          "hover:to-purple-500",
          "rounded-full",
          "transition"
        );
        downloadIcon.innerHTML = `
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-6 w-6 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 16v-8m0 8l-4-4m4 4l4-4m-7 8h10a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2z"
            />
          </svg>
        `;
        downloadIcon.addEventListener("click", () => handleDownload(file.name));
        listItem.appendChild(downloadIcon);
      }

      fileList.appendChild(listItem);
    });
  } else {
    fileList.innerHTML = "<li>No files found in the shared folder.</li>";
  }
}

// Enhanced Download Progress
async function handleDownload(filename) {
  const progressContainer = document.getElementById(
    "downloadProgressContainer"
  );
  const progressBar = document.getElementById("downloadProgress");
  const progressText = document.getElementById("downloadPercentage");

  // Reset progress container
  progressContainer.classList.remove("hidden", "animate-fade-out");
  progressContainer.classList.add("animate-fade-in");
  progressBar.style.width = "0%";
  progressBar.classList.remove("bg-green-500", "bg-red-500", "animate-pulse");
  progressText.textContent = "Preparing download...";

  try {
    // Fetch the file from the server
    const response = await fetch(`/download/${filename}`);

    if (!response.ok) {
      throw new Error(
        `Failed to download the file. Status: ${response.status}`
      );
    }

    const contentLength = response.headers.get("Content-Length");
    const total = contentLength ? parseInt(contentLength, 10) : 0;

    // If `Content-Length` is not available, fallback to no progress
    if (!total) {
      console.warn(
        "Content-Length not available, showing download complete only."
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Success state without progress
      progressBar.style.width = "100%";
      progressBar.classList.add("bg-green-500");
      progressText.textContent = "Download complete!";
      return;
    }

    // Handle progress with streams
    const reader = response.body.getReader();
    let receivedLength = 0;
    const chunks = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      receivedLength += value.length;

      // Calculate and update progress
      const percent = Math.round((receivedLength / total) * 100);
      progressBar.style.width = `${percent}%`;
      progressBar.classList.add("animate-pulse");
      progressText.textContent = `Downloading: ${percent}%`;
    }

    // Combine chunks into a blob and trigger download
    const blob = new Blob(chunks);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Success state
    progressBar.classList.remove("animate-pulse");
    progressBar.classList.add("bg-green-500");
    progressText.textContent = "Download complete!";

    // Wait before hiding
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } catch (error) {
    console.error("Error during download:", error);

    // Error state
    progressBar.classList.add("bg-red-500");
    progressText.textContent = "Download failed";

    // Wait before hiding
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } finally {
    // Hide progress container
    progressContainer.classList.add("animate-fade-out");
    setTimeout(() => {
      progressContainer.classList.add("hidden");
      progressContainer.classList.remove("animate-fade-in", "animate-fade-out");
      progressBar.classList.remove("bg-green-500", "bg-red-500");
      progressBar.style.width = "0%";
      progressText.textContent = "0%";
    }, 500);
  }
}

// Enhanced Upload Progress
document.getElementById("uploadFile")?.addEventListener("change", function () {
  const file = this.files[0];

  if (!file) {
    alert("No file selected!");
    return;
  }

  const progressContainer = document.getElementById("uploadProgressContainer");
  const progressBar = document.getElementById("uploadProgress");
  const progressText = document.getElementById("uploadPercentage");

  // Reset progress container
  progressContainer.classList.remove("hidden", "animate-fade-out");
  progressContainer.classList.add("animate-fade-in");
  progressBar.style.width = "0%";
  progressBar.classList.remove("bg-green-500", "bg-red-500", "animate-pulse");
  progressText.textContent = "Preparing upload...";

  const formData = new FormData();
  formData.append("file", file);

  const xhr = new XMLHttpRequest();
  xhr.open("POST", "/upload", true);

  // Track upload progress
  xhr.upload.onprogress = function (event) {
    if (event.lengthComputable) {
      const percent = Math.round((event.loaded / event.total) * 100);

      progressBar.style.width = `${percent}%`;
      progressBar.classList.add("animate-pulse");
      progressText.textContent = `Uploading: ${percent}%`;

      // Ensure progress bar stays visible
      progressContainer.classList.remove("hidden");
    }
  };

  // Success handler
  xhr.onload = function () {
    if (xhr.status === 200) {
      progressBar.classList.remove("animate-pulse");
      progressBar.classList.add("bg-green-500");
      progressText.textContent = "Upload complete!";

      // Reload shared files
      loadSharedFiles();

      // Keep progress visible
      setTimeout(() => {
        progressContainer.classList.add("animate-fade-out");
        setTimeout(() => {
          progressContainer.classList.add("hidden");
          progressBar.style.width = "0%";
          progressText.textContent = "0%";
        }, 500);
      }, 2000);
    } else {
      progressBar.classList.add("bg-red-500");
      progressText.textContent = "Upload failed";

      // Keep error visible
      setTimeout(() => {
        progressContainer.classList.add("animate-fade-out");
        setTimeout(() => {
          progressContainer.classList.add("hidden");
          progressBar.style.width = "0%";
          progressText.textContent = "0%";
        }, 500);
      }, 2000);
    }
  };

  // Error handler
  xhr.onerror = function () {
    progressBar.classList.add("bg-red-500");
    progressText.textContent = "Upload error";

    // Keep error visible
    setTimeout(() => {
      progressContainer.classList.add("animate-fade-out");
      setTimeout(() => {
        progressContainer.classList.add("hidden");
        progressBar.style.width = "0%";
        progressText.textContent = "0%";
      }, 500);
    }, 2000);
  };

  // Send the request
  xhr.send(formData);
});

// Rest of the existing code remains the same...

// Search functionality
document.getElementById("searchInput")?.addEventListener("input", handleSearch);

async function handleSearch() {
  const query = document.getElementById("searchInput").value.trim();
  if (!query) {
    displayFiles(fullFileList);
    return;
  }

  const fileList = document.getElementById("fileList");
  fileList.innerHTML = "<li>Searching...</li>";

  try {
    const response = await fetch(`/search?query=${encodeURIComponent(query)}`);

    if (!response.ok) {
      throw new Error("Failed to fetch search results.");
    }

    const result = await response.json();
    displayFiles(result.results);
  } catch (error) {
    console.error("Error during search:", error);
    fileList.innerHTML = "<li>Error occurred during search.</li>";
  }
}

// Automatically load shared files when the page loads
if (document.getElementById("fileList")) {
  loadSharedFiles();
}

// Add Enter key functionality for search bar
document.getElementById("searchInput")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleSearch();
});

// Logout functionality
document
  .getElementById("logoutButton")
  ?.addEventListener("click", async function () {
    try {
      const response = await fetch("/logout", { method: "POST" });

      if (response.ok) {
        window.location.href = "/";
      } else {
        alert("Failed to logout");
      }
    } catch (error) {
      alert("Error logging out: " + error.message);
    }
  });
