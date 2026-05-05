import { storage } from './firebase'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

export async function uploadPedidoMedico(userId, file) {
  const storageRef = ref(storage, `pedidos/${userId}/${Date.now()}_${file.name}`)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}

export async function uploadFotoPerfil(userId, file) {
  const storageRef = ref(storage, `perfiles/${userId}/${Date.now()}_${file.name}`)
  await uploadBytes(storageRef, file)
  return getDownloadURL(storageRef)
}
