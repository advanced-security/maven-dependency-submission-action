#!/bin/bash

echo -x

JDK_VERSION="18.0.2.1"
JDK_INSTALLER="/tmp/openjdk.tar.gz"

MVN_VERSION="3.9.4"
MVN_INSTALLER="/tmp/mvn.tar.gz"

wget https://download.java.net/java/GA/jdk${JDK_VERSION}/db379da656dc47308e138f21b33976fa/1/GPL/openjdk-${JDK_VERSION}_linux-x64_bin.tar.gz -O ${JDK_INSTALLER}
sudo tar -xC /usr/local/sbin -vf ${JDK_INSTALLER}

sudo rm /usr/local/sbin/java
sudo ln -s /usr/local/sbin/jdk-${JDK_VERSION}/bin/java /usr/local/sbin/java

sudo rm /usr/local/sbin/javac
sudo ln -s /usr/local/sbin/jdk-${JDK_VERSION}/bin/javac /usr/local/sbin/javac

wget https://dlcdn.apache.org/maven/maven-3/${MVN_VERSION}/binaries/apache-maven-${MVN_VERSION}-bin.tar.gz -O ${MVN_INSTALLER}
tar -xC /usr/local/sbin -vf ${MVN_INSTALLER}

sudo rm /usr/local/sbin/mvn
sudo ln -s /usr/local/sbin/apache-maven-${MVN_VERSION}/bin/mvn /usr/local/sbin/mvn