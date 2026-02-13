import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { CATEGORIES } from '../../config/financial.config';

const SETTINGS_COLLECTION = 'settings';

export class CategoryService {

    /**
     * Get categories for a user.
     * If no custom categories exist, returns the default list and saves it.
     */
    static async getUserCategories(userId: string): Promise<string[]> {
        try {
            const settingsRef = doc(db, 'artifacts', 'finai-assist-pwa', 'users', userId, SETTINGS_COLLECTION, 'general');
            const snapshot = await getDoc(settingsRef);

            if (snapshot.exists() && snapshot.data().categories) {
                return snapshot.data().categories;
            } else {
                // Initialize with defaults if not found
                await setDoc(settingsRef, { categories: CATEGORIES }, { merge: true });
                return CATEGORIES;
            }
        } catch (error) {
            console.error("Error fetching categories:", error);
            return CATEGORIES; // Fallback to defaults
        }
    }

    /**
     * Add a new category
     */
    static async addCategory(userId: string, currentCategories: string[], newCategory: string): Promise<string[]> {
        if (currentCategories.includes(newCategory)) return currentCategories;

        const updatedCategories = [...currentCategories, newCategory];
        const settingsRef = doc(db, 'artifacts', 'finai-assist-pwa', 'users', userId, SETTINGS_COLLECTION, 'general');

        await setDoc(settingsRef, { categories: updatedCategories }, { merge: true });
        return updatedCategories;
    }

    /**
     * Delete a category
     */
    static async deleteCategory(userId: string, currentCategories: string[], categoryToDelete: string): Promise<string[]> {
        const updatedCategories = currentCategories.filter(c => c !== categoryToDelete);
        const settingsRef = doc(db, 'artifacts', 'finai-assist-pwa', 'users', userId, SETTINGS_COLLECTION, 'general');

        await setDoc(settingsRef, { categories: updatedCategories }, { merge: true });
        return updatedCategories;
    }
}
