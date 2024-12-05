let fullFileList = []; // Store the full list of files and folders

// Login functionality
document
  .getElementById("loginForm")
  ?.addEventListener("submit", async function (e) {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    const response = await fetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    const result = await response.json();
    const messageDiv = document.getElementById("message");
    messageDiv.textContent = result.message;
    messageDiv.style.color = response.ok ? "green" : "red";

    if (response.ok && result.otp_required) {
      // Hide login form, show OTP form
      document.getElementById("loginFormContainer").classList.add("hidden");
      document.getElementById("otpFormContainer").classList.remove("hidden");

      // Store username for OTP verification
      sessionStorage.setItem("username", username);
    } else if (response.ok) {
      // Direct login success
      window.location.href = "/shared_folders";
    }
  });

// OTP Verification Functionality
document
  .getElementById("otpForm")
  ?.addEventListener("submit", async function (e) {
    e.preventDefault();

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

    if (response.ok) {
      window.location.href = "/shared_folders";
    }
  });

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
