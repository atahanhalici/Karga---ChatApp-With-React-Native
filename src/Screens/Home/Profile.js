import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Dimensions,ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firebase from '@react-native-firebase/app';
import database from '@react-native-firebase/database';

const Profile = () => {
    const [user, setUser] = useState(null);
    const [friendsCount, setFriendsCount] = useState(0);
    const [conversationsCount, setConversationsCount] = useState(0);
    const [groupsCount, setGroupsCount] = useState(0);
    const userId = firebase.auth().currentUser.uid;

    useEffect(() => {
        const userRef = firebase.app().database('https://karga-303a6-default-rtdb.europe-west1.firebasedatabase.app/').ref(`/users/${userId}`);
        userRef.on('value', snapshot => {
            const userData = snapshot.val();
            setUser(userData);

            if (userData.friends) {
                setFriendsCount(Object.keys(userData.friends).length);
            }

            if (userData.conversations) {
                setConversationsCount(Object.keys(userData.conversations).length);
            }

            if (userData.groups) {
                setGroupsCount(Object.keys(userData.groups).length);
            }
        });

        // Cleanup on unmount
        return () => userRef.off();
    }, [userId]);

    if (!user) {
        return (
            <View style={styles.indicator}>
            <ActivityIndicator size="large" color="#FF8400" />
        </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.scrollContainer}>
            <View style={styles.container}>
                <View style={styles.profileContainer}>
                    <Image source={{ uri: user.picture }} style={styles.profilePicture} />
                    <TouchableOpacity style={styles.editButton}>
                        <Icon name="edit" size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.username}>{user.userName}</Text>
                <Text style={styles.bio}>{user.bio}</Text>
                
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{friendsCount}</Text>
                        <Text style={styles.statLabel}>Friends</Text>
                    </View>
                    <View style={styles.divider}></View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{conversationsCount}</Text>
                        <Text style={styles.statLabel}>Conversations</Text>
                    </View>
                    <View style={styles.divider}></View>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{groupsCount}</Text>
                        <Text style={styles.statLabel}>Groups</Text>
                    </View>
                </View>
            </View>
            <View style={styles.optionsContainer}>
                {renderOption('edit', 'Edit Profile')}
                {renderDivider()}
                {renderOption('people', 'My Friends')}
                {renderDivider()}
                {renderOption('bookmark', 'Saved Messages')}
                {renderDivider()}
                {renderOption('notifications', 'Notification Settings')}
                {renderDivider()}
                {renderOption('logout', 'Logout')}
            </View>
        </ScrollView>
    );
}

const renderOption = (iconName, title) => {
    return (
        <TouchableOpacity style={styles.option}>
            <View style={styles.optionLeft}>
                <View style={styles.iconBackground}>
                    <Icon name={iconName} size={28} color="#FFF" />
                </View>
                <Text style={styles.optionText}>{title}</Text>
            </View>
            <Icon name="keyboard-arrow-right" size={24} color="#666" />
        </TouchableOpacity>
    );
};

const renderDivider = () => {
    return <View style={styles.optionDivider} />;
};

const styles = StyleSheet.create({
    indicator: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    scrollContainer: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        flex: 1,
        borderTopRightRadius: 30,
        borderTopLeftRadius: 30,
        justifyContent: 'flex-start', // 'center' yerine 'flex-start'
        alignItems: 'center',
        borderBottomLeftRadius: 25,
        borderBottomRightRadius: 25,
        backgroundColor:'#f5f5f5',
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 5 },
        shadowOpacity: 1,
        shadowRadius: 5,
        elevation: 7,
        paddingVertical: 20,
    },
    profileContainer: {
        position: 'relative',
        alignItems: 'center',
    },
    iconBackground: {
        width: 40,
        height: 40,
        borderRadius: 30,
        backgroundColor: '#FF8400',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    profilePicture: {
        width: 150,
        height: 150,
        borderRadius: 75,
        marginBottom: 10,
    },
    editButton: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        backgroundColor: '#000',
        borderRadius: 20,
        padding: 5,
    },
    username: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
    },
    bio: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    statsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: Dimensions.get('window').width,
        marginTop: 20,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    statLabel: {
        fontSize: 14,
        color: '#666',
    },
    divider: {
        width: 1,
        height: '60%',
        backgroundColor: '#ccc',
    },
    optionsContainer: {
        width: Dimensions.get('window').width,
        paddingVertical: 10,
        flex: 1,
    },
    option: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
        marginVertical:5
    },
    optionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    optionText: {
        marginLeft: 15,
        fontSize: 17,
        fontWeight: 'bold',
        color: '#333',
    },
    optionDivider: {
        height: 1,
        backgroundColor: '#ccc',
        marginHorizontal: 20,
    }
});

export default Profile;
