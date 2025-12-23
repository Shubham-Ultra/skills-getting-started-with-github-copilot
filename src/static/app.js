document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Add small stylesheet for participants UI
  const style = document.createElement("style");
  style.textContent = `
    .activity-card { border: 1px solid #e1e4e8; padding: 12px; border-radius: 8px; margin: 8px 0; background: linear-gradient(180deg, #ffffff, #fbfbfc); box-shadow: 0 4px 10px rgba(3,102,214,0.04); }
    .activity-card h4 { margin: 0 0 6px 0; font-size: 1.05rem; }
    .participants { margin-top: 10px; }
    .participants-list { list-style: none; margin: 6px 0 0 0; padding: 0; }
    .participants-list li { margin: 6px 0; font-size: 0.95rem; color: #24292e; display:flex; align-items:center; gap:8px; justify-content:space-between; }
    .participant-meta { display:inline-flex; align-items:center; gap:8px; }
    .participant-avatar { width:28px; height:28px; border-radius:50%; background:#0366d6; color:#fff; display:inline-flex; align-items:center; justify-content:center; font-size:0.8rem; font-weight:600; }
    .participant-email { color:#24292e; }
    .participant-remove { background:transparent; border:none; color:#d73a49; cursor:pointer; font-size:1rem; padding:6px; border-radius:6px; transition:background .12s; }
    .participant-remove:hover { background:rgba(215,58,73,0.08); }
    .participants-none { color:#6a737d; font-style:italic; padding:6px 0; }
    .spots-left { font-weight:600; color:#0366d6; }
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
          <p><strong>Availability:</strong> <span class="spots-left">${spotsLeft}</span> spots left</p>

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
            const meta = document.createElement("div");
            meta.className = "participant-meta";
            const initials = (p.split("@")[0] || "").slice(0,2).toUpperCase();
            meta.innerHTML = `<span class="participant-avatar" aria-hidden="true">${initials || "U"}</span> <span class="participant-email">${p}</span>`;

            const removeBtn = document.createElement("button");
            removeBtn.className = "participant-remove";
            removeBtn.setAttribute("aria-label", `Remove ${p}`);
            removeBtn.dataset.email = p;
            removeBtn.dataset.activity = name;
            removeBtn.textContent = "✕";

            removeBtn.addEventListener("click", async (e) => {
              e.preventDefault();
              const email = removeBtn.dataset.email;
              const activityName = removeBtn.dataset.activity;
              try {
                const res = await fetch(`/activities/${encodeURIComponent(activityName)}/signup?email=${encodeURIComponent(email)}`, { method: "DELETE" });
                const body = await res.json().catch(() => ({}));
                if (res.ok) {
                  // remove the list item
                  li.remove();

                  // update spots-left
                  const spotsEl = activityCard.querySelector('.spots-left');
                  if (spotsEl) {
                    // increment by 1
                    const current = parseInt(spotsEl.textContent, 10) || 0;
                    spotsEl.textContent = String(current + 1);
                  }

                  // if no participants left, show placeholder
                  const remaining = listEl.querySelectorAll('li').length;
                  if (remaining === 0) {
                    const none = document.createElement('li');
                    none.className = 'participants-none';
                    none.textContent = 'No participants yet';
                    listEl.appendChild(none);
                  }

                  messageDiv.textContent = body.message || 'Participant removed';
                  messageDiv.className = 'success';
                  messageDiv.classList.remove('hidden');
                  setTimeout(() => messageDiv.classList.add('hidden'), 4000);
                } else {
                  messageDiv.textContent = body.detail || 'Failed to remove participant';
                  messageDiv.className = 'error';
                  messageDiv.classList.remove('hidden');
                }
              } catch (err) {
                console.error('Error removing participant:', err);
                messageDiv.textContent = 'Failed to remove participant. Try again.';
                messageDiv.className = 'error';
                messageDiv.classList.remove('hidden');
              }
            });

            li.appendChild(meta);
            li.appendChild(removeBtn);
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

        // Update the activity card in-place so the new participant appears immediately
        (function addParticipantToCard() {
          const activityCards = activitiesList.querySelectorAll('.activity-card');
          let targetCard = null;
          activityCards.forEach((card) => {
            const h4 = card.querySelector('h4');
            if (h4 && h4.textContent.trim() === activity) {
              targetCard = card;
            }
          });

          if (!targetCard) return;

          const listEl = targetCard.querySelector('.participants-list');
          if (!listEl) return;

          // Remove "No participants yet" placeholder if present
          const placeholder = listEl.querySelector('.participants-none');
          if (placeholder) placeholder.remove();

          // Create new list item
          const li = document.createElement('li');
          const meta = document.createElement('div');
          meta.className = 'participant-meta';
          const initials = (email.split('@')[0] || '').slice(0,2).toUpperCase();
          meta.innerHTML = `<span class="participant-avatar" aria-hidden="true">${initials || 'U'}</span> <span class="participant-email">${email}</span>`;

          const removeBtn = document.createElement('button');
          removeBtn.className = 'participant-remove';
          removeBtn.setAttribute('aria-label', `Remove ${email}`);
          removeBtn.dataset.email = email;
          removeBtn.dataset.activity = activity;
          removeBtn.textContent = '✕';

          removeBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const emailToRemove = removeBtn.dataset.email;
            const activityName = removeBtn.dataset.activity;
            try {
              const res = await fetch(`/activities/${encodeURIComponent(activityName)}/signup?email=${encodeURIComponent(emailToRemove)}`, { method: 'DELETE' });
              const body = await res.json().catch(() => ({}));
              if (res.ok) {
                li.remove();
                const spotsEl = targetCard.querySelector('.spots-left');
                if (spotsEl) {
                  const current = parseInt(spotsEl.textContent, 10) || 0;
                  spotsEl.textContent = String(current + 1);
                }
                const remaining = listEl.querySelectorAll('li').length;
                if (remaining === 0) {
                  const none = document.createElement('li');
                  none.className = 'participants-none';
                  none.textContent = 'No participants yet';
                  listEl.appendChild(none);
                }
                messageDiv.textContent = body.message || 'Participant removed';
                messageDiv.className = 'success';
                messageDiv.classList.remove('hidden');
                setTimeout(() => messageDiv.classList.add('hidden'), 4000);
              } else {
                messageDiv.textContent = body.detail || 'Failed to remove participant';
                messageDiv.className = 'error';
                messageDiv.classList.remove('hidden');
              }
            } catch (err) {
              console.error('Error removing participant:', err);
              messageDiv.textContent = 'Failed to remove participant. Try again.';
              messageDiv.className = 'error';
              messageDiv.classList.remove('hidden');
            }
          });

          li.appendChild(meta);
          li.appendChild(removeBtn);
          listEl.appendChild(li);

          // Decrement spots-left
          const spotsEl = targetCard.querySelector('.spots-left');
          if (spotsEl) {
            const current = parseInt(spotsEl.textContent, 10) || 0;
            // Prevent negative numbers
            const next = Math.max(0, current - 1);
            spotsEl.textContent = String(next);
          }
        })();
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
