import { useState, useEffect } from "react";
import { useCamera } from "@ionic/react-hooks/camera";
import { useFilesystem, base64FromPath } from "@ionic/react-hooks/filesystem";
import { useStorage } from "@ionic/react-hooks/storage";
import { isPlatform } from "@ionic/react";
import { CameraResultType, CameraSource, CameraPhoto, Capacitor, FilesystemDirectory } from "@capacitor/core";

const PHOTO_STORAGE = "photos-ionic";

export function usePhotoGallery() {
    const { getPhoto } = useCamera();
    const [photos, setPhotos] = useState<Photo[]>([]);
    const { deleteFile, getUri, readFile, writeFile } = useFilesystem();
    const { get, set } = useStorage();

    const savePicture = async (photo: CameraPhoto, fileName: string): Promise<Photo> => {
        let base64Data: string;
        if(isPlatform('hybrid')) {
            const file = await readFile({
                path: photo.path!
            });
            base64Data = file.data;
        } else {
            base64Data = await base64FromPath(photo.webPath!);
        }
        const saveFile = await writeFile({
            path: fileName,
            data: base64Data,
            directory: FilesystemDirectory.Data
        });
        if (isPlatform('hybrid')) {
            return {
                filepath: saveFile.uri,
                webviewPath: Capacitor.convertFileSrc(saveFile.uri),
            };
        } else {
            return {
                filepath: fileName,
                webviewPath: photo.webPath
            };
        }
    };
    useEffect(() => {
        const loadSaved = async () => {
            const photoString = await get('photos');
            const photosInStorage = (photoString ? JSON.parse(photoString) : []) as Photo[];
            // If running on the web...
            if (!isPlatform('hybrid')) {
                for (let photo of photosInStorage) {
                const file = await readFile({
                    path: photo.filepath,
                    directory: FilesystemDirectory.Data
                });
                // Web platform only: Load photo as base64 data
                photo.webviewPath = `data:image/jpeg;base64,${file.data}`;
                }
            }
            setPhotos(photosInStorage);
        };
        loadSaved();
    }, [get, readFile]);
    const takePhoto = async () => {
        const cameraPhoto = await getPhoto({
            resultType: CameraResultType.Uri,
            source: CameraSource.Camera,
            quality: 100
        });
        const fileName = new Date().getTime() + '.jpeg';
        const savedFileImage = await savePicture(cameraPhoto, fileName);
        const newPhotos = [savedFileImage, ...photos];
        setPhotos(newPhotos);
        set(PHOTO_STORAGE, JSON.stringify(newPhotos));
    };

    return {
        photos,
        takePhoto
    };
}

export interface Photo {
    filepath: string;
    webviewPath?: string;
}