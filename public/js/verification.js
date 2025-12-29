// Client-side cryptographic verification

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyCommitment(commitment, data, salt) {
  const computed = await sha256(data + salt);
  return commitment === computed;
}

async function verifyAssignmentCommitment(playerName, factions, salt, commitment) {
  const factionNames = factions.map(f => f.name).sort().join(',');
  const data = `${playerName}:${factionNames}`;
  return await verifyCommitment(commitment, data, salt);
}

async function verifySelectionCommitment(playerName, selectedFaction, salt, commitment) {
  const data = `${playerName}:${selectedFaction.name}`;
  return await verifyCommitment(commitment, data, salt);
}

async function verifyAllCommitments(players) {
  let allValid = true;

  for (const player of players) {
    // Verify assignment commitment
    const assignmentValid = await verifyAssignmentCommitment(
      player.name,
      player.factions,
      player.assignmentSalt,
      player.assignmentCommitment
    );

    if (!assignmentValid) {
      console.error(`Assignment commitment verification failed for ${player.name}`);
      allValid = false;
    }

    // Verify selection commitment
    const selectionValid = await verifySelectionCommitment(
      player.name,
      player.selectedFaction,
      player.selectionSalt,
      player.selectionCommitment
    );

    if (!selectionValid) {
      console.error(`Selection commitment verification failed for ${player.name}`);
      allValid = false;
    }

    // Verify selection was in options
    const wasInOptions = player.factions.some(f => f.id === player.selectedFaction.id);
    if (!wasInOptions) {
      console.error(`${player.name} selected a faction not in their options!`);
      allValid = false;
    }
  }

  if (allValid) {
    console.log('✓ All cryptographic commitments verified successfully');
  } else {
    showError('⚠️ Commitment verification failed! Data may have been tampered with.');
  }

  return allValid;
}

// Export functions for use in other scripts
window.verifyAllCommitments = verifyAllCommitments;
window.sha256 = sha256;
