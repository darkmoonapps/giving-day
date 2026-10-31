export function isFinalDeliveryStatus(status: string): boolean {
  return status === 'delivered' || status === 'not_delivered';
}

export function areAllDeliveriesFinished(
  deliveries: ReadonlyArray<{ status: string }>
): boolean {
  return (
    deliveries.length > 0 &&
    deliveries.every((delivery) => isFinalDeliveryStatus(delivery.status))
  );
}

export function deliveriesJustFinished(
  previouslyFinished: boolean | null,
  currentlyFinished: boolean
): boolean {
  return previouslyFinished === false && currentlyFinished;
}
