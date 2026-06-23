const priorityMap = {
  Placement: 3,
  Result: 2,
  Event: 1
};

function sortNotifications(notifications) {

  notifications.sort((a, b) => {

    const p1 = priorityMap[a.Type];
    const p2 = priorityMap[b.Type];

    if (p1 !== p2) {
      return p2 - p1;
    }

    return (
      new Date(b.Timestamp) -
      new Date(a.Timestamp)
    );
  });

  return notifications.slice(0, 10);
}

module.exports = {
  sortNotifications
};