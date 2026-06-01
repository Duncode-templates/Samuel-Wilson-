import { 
  collection, 
  addDoc, 
  doc,
  updateDoc,
  increment,
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  Timestamp,
  serverTimestamp,
  getCountFromServer
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Comment } from '../types';
import { signInAnonymously } from 'firebase/auth';
import { getSetting } from './storage';

/**
 * Gets the number of comments for a chapter quickly using aggregation query
 */
export const getCommentCount = async (chapterId: string) => {
  try {
    const q = query(collection(db, 'comments'), where('chapterId', '==', chapterId));
    const snapshot = await getCountFromServer(q);
    return snapshot.data().count;
  } catch (error) {
    console.error('Error getting comment count:', error);
    return 0;
  }
};

/**
 * Ensures user is authenticated anonymously
 */
export const ensureAuth = async () => {
  if (!auth.currentUser) {
    try {
      const userCredential = await signInAnonymously(auth);
      return userCredential.user;
    } catch (error: any) {
      if (error.code === 'auth/admin-restricted-operation') {
        throw new Error('Anonymous authentication is disabled in Firebase Console. Please enable it in Authentication > Sign-in method.');
      }
      throw error;
    }
  }
  return auth.currentUser;
};

export const postComment = async (commentData: Omit<Comment, 'id' | 'timestamp' | 'userId' | 'username'>) => {
  const user = await ensureAuth();
  const guestName = await getSetting('username', 'Guest');
  
  try {
    const finalData: any = {
      chapterId: commentData.chapterId,
      novelId: commentData.novelId,
      content: commentData.content,
      level: commentData.level,
      userId: user.uid,
      username: guestName,
      userAvatar: null,
      likes: 0,
      dislikes: 0,
      timestamp: serverTimestamp(),
    };

    if (commentData.parentId) finalData.parentId = commentData.parentId;
    if (commentData.rootId) finalData.rootId = commentData.rootId;

    const docRef = await addDoc(collection(db, 'comments'), finalData);
    
    return docRef.id;
  } catch (error: any) {
    console.error('Firestore Error:', error);
    throw error;
  }
};

export const subscribeToComments = (chapterId: string, callback: (comments: Comment[]) => void) => {
  if (!chapterId) {
    console.warn('subscribeToComments called with empty chapterId');
    callback([]);
    return () => {};
  }

  console.log('Subscribing to comments for chapter:', chapterId);

  const q = query(
    collection(db, 'comments'),
    where('chapterId', '==', chapterId)
  );

  return onSnapshot(q, {
    next: (snapshot) => {
      console.log(`Fetched ${snapshot.size} comments for chapter ${chapterId}`);
      const comments = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          // Convert serverTimestamp to number for our frontend
          timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toMillis() : Date.now(),
        } as Comment;
      }).sort((a, b) => b.timestamp - a.timestamp); // Sort by timestamp desc on client
      
      callback(comments);
    },
    error: (error) => {
      console.error('Comments subscription error:', error);
      if (error.code === 'failed-precondition') {
        console.warn('Missing Firestore Index. Please create the index via the link in the console.');
      }
      callback([]); // Return empty list on error to prevent UI break
    }
  });
};

export const likeComment = async (commentId: string) => {
  const commentRef = doc(db, 'comments', commentId);
  await updateDoc(commentRef, {
    likes: increment(1)
  });
};

export const dislikeComment = async (commentId: string) => {
  const commentRef = doc(db, 'comments', commentId);
  await updateDoc(commentRef, {
    dislikes: increment(1)
  });
};
