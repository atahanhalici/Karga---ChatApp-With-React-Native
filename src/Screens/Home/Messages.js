import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions,Image } from 'react-native';
import { FAB } from 'react-native-paper';
import Modal from 'react-native-modal';
import firebase from '@react-native-firebase/app';
import { FlatList } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/FontAwesome5';
import { useNavigation } from '@react-navigation/native';

const Messages = ({filterText}) => {
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [friends, setFriends] = useState([]);
    const [conversations, setConversations] = useState([]);
    const navigation = useNavigation();
    const userId = firebase.auth().currentUser.uid;
    useEffect(() => {

        const userRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/users/${userId}/conversations`);
        
        const onConversationsChange = userRef.on('value', snapshot => {
            const conversationsData = snapshot.val() || {};
            fetchConversations(conversationsData, userId);
        });

        return () => userRef.off('value', onConversationsChange);
    }, []);

    const fetchConversations = async (conversationsData, userId) => {
        try {
            await Promise.all(
                Object.keys(conversationsData).map(async (conversationId) => {
                    const conversationRef = firebase
                        .app()
                        .database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
                        .ref(`/conversations/${conversationId}`);
                    
                    const conversationSnapshot = await conversationRef.once('value');
                    const conversation = conversationSnapshot.val();
                    
                    if (conversation && conversation.members) {
                        const friendId = conversation.members.find(id => id !== userId);
                        const friendRef = firebase
                            .app()
                            .database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/')
                            .ref(`/users/${friendId}`);
                        const friendSnapshot = await friendRef.once('value');
                        const friend = friendSnapshot.val();
    
                        const messages = conversation.messages ? Object.entries(conversation.messages) : [];
                        const sortedMessages = messages.sort(([, messageA], [, messageB]) => messageA.timestamp - messageB.timestamp);
                        const lastMessage = sortedMessages.length > 0 ? sortedMessages[sortedMessages.length - 1][1] : {'messageType':"text","text":""};

                        // Counting unread messages
                        const unreadMessagesCount = messages.reduce((count, [, message]) => {
                            if (message.userId !== userId && !message.read) {
                                return count + 1;
                            }
                            return count;
                        }, 0);
    
                        const updateConversations = (prevConversations) => {
                            const updatedConversations = prevConversations.filter(conv => conv.conversationId !== conversationId);
                            const newConversation = {
                                conversationId,
                                friend,
                                lastMessage,
                                unreadMessagesCount,
                                lastMessageTime: conversation.lastMessageTime // lastMessageTime'ı ekleyin
                            };
                            return [...updatedConversations, newConversation].sort((a, b) => b.lastMessageTime - a.lastMessageTime);
                        };
    
                        setConversations(updateConversations);
    
                        conversationRef.on('value', snapshot => {
                            const conversation = snapshot.val();
                            if (conversation && conversation.messages) {
                                const messages = Object.entries(conversation.messages);
                                const sortedMessages = messages.sort(([, messageA], [, messageB]) => messageA.timestamp - messageB.timestamp);
                                const lastMessage = sortedMessages.length > 0 ? sortedMessages[sortedMessages.length - 1][1] : {'messageType':"text","text":""};
                                const unreadMessagesCount = messages.reduce((count, [, message]) => {
                                    if (message.userId !== userId && !message.read) {
                                        return count + 1;
                                    }
                                    return count;
                                }, 0);
    
                                setConversations(prevConversations => {
                                    const updatedConversations = prevConversations.filter(conv => conv.conversationId !== conversationId);
                                    const newConversation = {
                                        conversationId,
                                        friend,
                                        lastMessage,
                                        unreadMessagesCount,
                                        lastMessageTime: conversation.lastMessageTime // lastMessageTime'ı ekleyin
                                    };
                                    return [...updatedConversations, newConversation].sort((a, b) => b.lastMessageTime - a.lastMessageTime);
                                });
                            }
                        });
                    }
                })
            );
        } catch (error) {
            console.error("Error fetching conversations:", error);
        }
    };
    

    const toggleModal = () => {
        setIsModalVisible(!isModalVisible);
        if (!isModalVisible) {
            fetchFriends();
        }
    };

    const fetchFriends = () => {
        try {
            const userId = firebase.auth().currentUser.uid;
            const userRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/users/${userId}`);
            var friendsRef;
            const onValueChange = userRef.on('value', snapshot => {
                const userData = snapshot.val();
                if (userData && userData.friends) {
                    const friendIds = userData.friends;
                    friendsRef  = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref('/users');
                    
                    friendsRef.on('value', snapshot => {
                        const allUsers = snapshot.val();
                        const friendsList = friendIds.map(id => allUsers[id]);
                        setFriends(friendsList);
                    }, error => {
                        console.error("Error fetching friends list:", error);
                    });
                }
            });
    
            return () => {
                userRef.off('value', onValueChange);
                friendsRef.off('value'); // Remember to turn off listener when the component unmounts
            };
        } catch (error) {
            console.error("Unexpected error:", error);
        }
    };

    const handleFriendPress = async (friend) => {
        const userId = firebase.auth().currentUser.uid;
        const conversationRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref('/conversations');
        const userRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/users/${userId}/conversations`);
    
        let conversationId;
    
        // Get user's conversations
        const userConversationsSnapshot = await userRef.once('value');
        const userConversations = userConversationsSnapshot.val() || {};
    
        // Check if a conversation with this friend already exists
        for (const [key, value] of Object.entries(userConversations)) {
            const conversationSnapshot = await conversationRef.child(key).once('value');
            const conversation = conversationSnapshot.val();
            if (conversation && conversation.members.includes(friend.userId)) {
                conversationId = key;
                break;
            }
        }
    
        // If conversation doesn't exist, create a new one
        if (!conversationId) {
            const newConversationRef = conversationRef.push();
            conversationId = newConversationRef.key;
            await newConversationRef.set({
                members: [userId, friend.userId].sort(),
                messages: {},
                userStatus: {
                    [userId]: {
                        inChat: true,
                        lastLeft: null
                    },
                    [friend.userId]: {
                        inChat: false, // or true if you want to mark them as in the chat initially
                        lastLeft: null
                    }
                }
            });
    
            // Add conversation to users' list
            const friendRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/users/${friend.userId}/conversations/${conversationId}`);
            await userRef.child(conversationId).set(true);
            await friendRef.set(true);
        } else {
            // Update user status to in chat
            await conversationRef.child(`${conversationId}/userStatus/${userId}`).update({
                inChat: true,
                lastLeft: null
            });
        }
    
        // Navigate to chat page
        navigation.navigate('Chat', { conversationId, name: friend.userName });
    };

    const filteredMessages = filterText.trim() === ""
    ? conversations
    : conversations.filter(message =>
        message.friend.userName.toLowerCase().includes(filterText.toLowerCase())
    );
    return (
        <View style={styles.container}>
            <FlatList
                data={filteredMessages}
                keyExtractor={(item) => item.conversationId}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={styles.item}
                        onPress={() => navigation.navigate('Chat', { conversationId: item.conversationId, name: item.friend.userName })}
                    >
                       <Image 
                                source={{ uri: item.friend.picture }} 
                                style={styles.profileImage} 
                            />
                        <View>
                            <Text style={styles.title}>{item.friend.userName}</Text>
                            <Text style={styles.name}>
  {item.lastMessage.messageType == "vibration" 
    ? (item.lastMessage.userId == userId 
      ? `${item.friend.userName} kullanıcısını titrettiniz` 
      : `${item.friend.userName} sizi titretti`) 
    :item.lastMessage.messageType == "image"? "📷": item.lastMessage.text}
</Text>
                            
                        </View>
                        <View style={{flex:1}}/>
                        <View style={{ marginRight: 15 }}>
  {item.unreadMessagesCount > 0 && (
    <View style={{ backgroundColor: '#FF8400', borderRadius: 100, paddingHorizontal: 10, paddingVertical: 6 }}>
      <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13 }}>{item.unreadMessagesCount}</Text>
    </View>
  )}
</View>


                        
                    </TouchableOpacity>
                )}
            />
            <FAB
                style={styles.fab}
                icon="message-text"
                color="white"
                onPress={toggleModal}
            />
            <Modal
                isVisible={isModalVisible}
                animationIn="slideInUp"
                animationOut="slideOutDown"
                onBackdropPress={toggleModal}
                backdropOpacity={0.5}
                style={styles.modal}
            >
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Friends</Text>
                    <FlatList
                        data={friends}
                        keyExtractor={(item) => item.userId}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={styles.item}
                                onPress={() => handleFriendPress(item)}
                            >
                                <Image 
                                source={{ uri: item.picture }} 
                                style={styles.profileImage} 
                            />
                                <View>
                                    <Text style={styles.title}>{item.userName}</Text>
                                    <Text style={styles.name}>{item.bio}</Text>
                                </View>
                                <View style={{flex:1}} />
                                <View style={[styles.dot, { backgroundColor: (item.online) ? 'green' : 'red' }]} />
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Modal>
        </View>
    );
};
const styles = StyleSheet.create({
    profileImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 15,
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
        width: "100%",
    },
    text: {
        fontSize: 18,
        color: '#333',
    },
    fab: {
        position: 'absolute',
        margin: 16,
        right: 0,
        bottom: 0,
        backgroundColor: '#FF8400',
    },
    modal: {
        justifyContent: 'flex-end',
        margin: 0,
    },
    modalContent: {
        backgroundColor: 'white',
        padding: 22,
        justifyContent: 'center',
        alignItems: 'center',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '70%',
    },
    modalTitle: {
        fontSize: 20,
        marginBottom: 10,
    },
    friendItem: {
        fontSize: 18,
        color:'black',
        
    },
    item: {
        backgroundColor: 'white',
        padding: 10,
        width: Dimensions.get('window').width - 20,
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 5
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: 'black'
    },
    name: {
        fontSize: 14,
        color: 'black'
    },
    dot: {
        width: 13,
        height: 13,
        borderRadius: 7.5, // Yarıçap, genişlik ve yüksekliğin yarısı olmalıdır
        marginRight: 40, // İkona padding-right vermek yerine margin-right kullanıyoruz
    }
});

export default Messages;