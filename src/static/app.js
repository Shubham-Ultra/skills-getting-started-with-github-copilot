document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Add small stylesheet for participants UI
  const style = document.createElement("style");
  style.textContent = `
    .activity-card { border: 1px solid #e1e4e8; padding: 12px; border-radius: 8px; margin: 8px 0; background: #fff; box-shadow: 0 1px 2px rgba(27,31,35,0.04); }
    .activity-card h4 { margin: 0 0 6px 0; font-size: 1.05rem; }
    .participants { margin-top: 10px; }
    .participants-list { list-style: disc; margin: 6px 0 0 20px; padding: 0; }
    .participants-list li { margin: 4px 0; font-size: 0.95rem; color: #24292e; display:flex; align-items:center; gap:8px; }
    .participant-avatar { width:20px; height:20px; border-radius:50%; background:#0366d6; color:#fff; display:inline-flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:600; }
    .participants-none { color:#6a737d; font-style:italic; }
  `;
  document.head.appendChild(style);

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>

          <div class="participants">
            <strong>Participants:</strong>
            <ul class="participants-list" aria-label="participants list"></ul>
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Populate participants list (pretty bullets with small avatar)
        const listEl = activityCard.querySelector(".participants-list");
        if (details.participants && details.participants.length > 0) {
          details.participants.forEach((p) => {
            const li = document.createElement("li");
            const initials = (p.split("@")[0] || "").slice(0,2).toUpperCase();
            li.innerHTML = `<span class="participant-avatar" aria-hidden="true">${initials || "U"}</span> <span class="participant-email">${p}</span>`;
            listEl.appendChild(li);
          });
        } else {
          const li = document.createElement("li");
          li.className = "participants-none";
          li.textContent = "No participants yet";
          listEl.appendChild(li);
        }

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
