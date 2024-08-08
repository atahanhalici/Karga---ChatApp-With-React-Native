import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome5';
import LinearGradient from 'react-native-linear-gradient';

const NotificationSettings = () => {
    const navigation = useNavigation();
    const [selectedTab, setSelectedTab] = useState('General');

    const renderTabContent = () => {
        switch (selectedTab) {
            case 'General':
                return <Text style={styles.tabContent}>General Settings</Text>;
            case 'Users':
                return <Text style={styles.tabContent}>Users Settings</Text>;
            case 'Groups':
                return <Text style={styles.tabContent}>Groups Settings</Text>;
            default:
                return null;
        }
    };

    return (
        <LinearGradient
            style={styles.background}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.8, y: 0 }}
            colors={['#FF8400', '#FFA500']}
        >
            <View style={{ marginHorizontal: 15, marginVertical: 20 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Icon name="arrow-left" size={25} color="white" />
                    </TouchableOpacity>
                    <View style={{ flex: 1 }} />
                    <Image style={{ width: 35, height: 35, marginRight: 10 }} source={require('../../../assets/images/logo_icon.png')} />
                    <Text style={{ fontSize: 27, fontWeight: '800', color: 'white' }}>Karga</Text>
                </View>
            </View>
            <View style={styles.container}>
                <Text style={styles.title}>Notification Settings</Text>
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, selectedTab === 'General' && styles.activeTab]}
                        onPress={() => setSelectedTab('General')}
                    >
                        <Text style={[styles.tabText, selectedTab === 'General' && styles.activeTabText]}>General</Text>
                        {selectedTab === 'General' && <View style={styles.tabUnderline} />}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, selectedTab === 'Users' && styles.activeTab]}
                        onPress={() => setSelectedTab('Users')}
                    >
                        <Text style={[styles.tabText, selectedTab === 'Users' && styles.activeTabText]}>Users</Text>
                        {selectedTab === 'Users' && <View style={styles.tabUnderline} />}
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, selectedTab === 'Groups' && styles.activeTab]}
                        onPress={() => setSelectedTab('Groups')}
                    >
                        <Text style={[styles.tabText, selectedTab === 'Groups' && styles.activeTabText]}>Groups</Text>
                        {selectedTab === 'Groups' && <View style={styles.tabUnderline} />}
                    </TouchableOpacity>
                </View>
            </View>
        </LinearGradient>
    );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    background: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    container: {
        backgroundColor: 'white',
        flex: 1,
        borderTopRightRadius: 30,
        borderTopLeftRadius: 30,
        paddingTop: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 25,
        fontWeight: 'bold',
        color: '#4B4B4B',
        alignSelf: 'flex-start',
        marginLeft: 20,
        marginBottom: 20,
    },
    tabContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        borderBottomWidth: 1,
        borderBottomColor: '#ddd',
        paddingBottom: 10,
    },
    tab: {
        alignItems: 'center',
    },
    tabText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'grey',
    },
    activeTab: {
        borderBottomWidth: 1,
        borderBottomColor: '#FF8400',
    },
    activeTabText: {
        color: '#FF8400',
    },
    tabUnderline: {
        height: 1,
        backgroundColor: '#FF8400',
        width: '100%',
        marginTop: 5,
    },
});

export default NotificationSettings;
