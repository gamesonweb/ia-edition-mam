// normalise un angle en radians dans l'intervalle [-PI, PI] (utile pour le suivi de la cam et rotation)
export function normalizeAngle(angle: number): number {
    let normalizedAngle = angle;

    while (normalizedAngle > Math.PI) {
        normalizedAngle -= Math.PI * 2;
    }
    while (normalizedAngle < -Math.PI) {
        normalizedAngle += Math.PI * 2;
    }

    return normalizedAngle;
}
